import Phaser from 'phaser';
import { FAMILY_INFO, PERKS, TARGET_NAMES } from '../../content/perks';
import { COLS, ROWS } from '../../content/tuning';
import { capOf, type GameState } from '../../core/game';
import type { CascadeResult, Family } from '../../core/types';
import { buildMachine, hasMachineArt } from '../machine';
import { ONBOARDING_BOLTS } from '../../core/economy';
import { LEVELS, levelReward, starGoals, starsFor } from '../../content/levels';
import { sfx } from '../audio';
import * as tlog from '../../platform/telemetry';
import { META_KEY, SAVE_KEY } from '../../platform/backup';
import { BOSSES } from '../../core/boss';
import { RUSH_REWARDS } from '../../core/rush';
import { CRATES, GEM_REWARDS, unitDef, type CrateKind } from '../../content/units';
import { endlessPos, endlessReward } from '../../core/endless';
import { contractMet, contractsFor, contractText, MASTERY_BOLTS } from '../../core/mastery';
import { HELP, notePuzzleAttempt, puzzleHelp, puzzleReward } from '../../core/puzzle';
import { applyCommand, replayRun } from '../../core/replay';
import { paceFromLog, updatePace } from '../../core/pace';
import { BONUS_XP } from '../../core/season';
import { BOUNTY_BOLTS, MASTERY_CHAIN, MASTERY_MILESTONES, MASTERY_TIME_LEFT } from '../../core/bounty';
import { localDate, store } from '../meta';
import { FEATURE_INFO } from '../unlocks';
import type { GameScene } from '../GameScene';
import { W, REDUCED_MOTION, TROPHY_AT, TROPHY_SHELF, YARD_UNLOCK, H, fmt, PUZZLES } from '../sceneKit';

export function openResult(scene: GameScene, won: boolean) {
  if (scene.modal) scene.closeModal();
  // the run is over: its last 'playing' snapshot must never resume (a lost fight retried, a won one replayed)
  store(SAVE_KEY, null);
  if (scene.s.rush) return scene.openRushResult(won);
  if (scene.s.bounty) return scene.openBountyResult(won);
  if (scene.s.endless) return scene.openEndlessResult(won);
  if (scene.s.puzzle) return scene.openPuzzleResult(won);
  if (scene.s.level !== undefined) return scene.playBestChain(() => scene.openLevelResult(won));
  const s = scene.s;
  const m = scene.meta;
  m.runs++;
  let newBest = false;
  if (won) {
    m.wins++;
    const rkey = s.remix ? `${s.target}:${scene.activeToys()[0] ?? 'none'}` : '';
    const prev = s.remix ? (m.remixBest[rkey] ?? null) : s.hard ? m.bestTimeHard : m.bestTime;
    if (s.remix && (prev === null || s.elapsed < prev)) {
      m.remixBest[rkey] = s.elapsed;
      newBest = true;
    } else if (!s.remix && !s.practice && (prev === null || s.elapsed < prev)) {
      if (s.hard) m.bestTimeHard = s.elapsed;
      else m.bestTime = s.elapsed;
      newBest = true;
    }
    // t-2fd7bb86: a classic win no longer opens features (they follow the road, unlocks.ts)
    m.hardUnlocked = true;
  }
  m.bestChain = Math.max(m.bestChain, s.stats.biggestChain);
  const mastery = (m.mastery ??= {});
  const newBests: string[] = [];
  for (const [fam, r] of Object.entries(scene.runBest) as [Family, number][]) {
    if (r > (mastery[fam] ?? 0)) {
      if ((mastery[fam] ?? 0) > 0 || r >= 2) newBests.push(`${FAMILY_INFO[fam].name} ${r}`);
      mastery[fam] = r;
    }
  }
  const pay = scene.settleBolts(won);
  const daily = s.daily ? scene.recordDaily(won) : null;
  if (daily) newBest = false;
  store(META_KEY, JSON.stringify(m));
  store(SAVE_KEY, null);
  won ? sfx.win() : sfx.lose();
  // ChatGPT r13 layout: headline first, the machine in a fixed region, few big numbers, "new this run", details, CTA stack
  const PH = 1000;
  const c = scene.panel(PH);
  const top = H / 2 - PH / 2;
  const txt = (y: number, t: string, size: number, color: string, font = 'Lilita One, Arial Black') =>
    c.add(scene.add.text(W / 2, y, t, { fontFamily: font, fontStyle: font === 'Arial' ? 'bold' : '', fontSize: `${size}px`, color, align: 'center', wordWrap: { width: W - 150 } }).setOrigin(0.5));
  const head = scene.add.text(W / 2, top + 70, won ? `${TARGET_NAMES[Math.max(0, s.target)]} DEFEATED!` : "TIME'S UP!", { fontFamily: 'Lilita One, Arial Black', fontSize: '58px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5);
  while (head.width > W - 140 && Number.parseInt(String(head.style.fontSize)) > 30) head.setFontSize(Number.parseInt(String(head.style.fontSize)) - 4);
  c.add(head);
  const sub = won
    ? `${s.elapsed.toFixed(1)}s${newBest ? '  ·  NEW BEST!' : ''}${s.practice ? '  (practice)' : ''}`
    : s.remix
      ? `${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`
      : `Beat ${s.target} of 3  ·  ${TARGET_NAMES[s.target]} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%`;
  txt(top + 128, sub, 30, newBest ? '#2f8a3a' : '#5a4a5a');
  if (hasMachineArt(scene)) {
    const pic = buildMachine(scene, W / 2, top + 390, 430, scene.runBest, s.toys[0] ?? null, s.shooter ?? 'cannon')!;
    c.add(pic);
    const sc0 = pic.scale;
    scene.tweens.add({ targets: pic, scale: { from: sc0 * 0.7, to: sc0 }, duration: 380, ease: 'Back.Out' });
    txt(top + 420, won ? 'Your machine this run, built from your best merges' : 'Your machine this run. Merge higher to grow it!', 21, '#7a5a4a', 'Arial');
  }
  const big = [`Biggest chain x${s.stats.biggestChain}`, pay && pay.total > 0 ? `+${pay.total} BOLTS` : ''].filter(Boolean).join('    ');
  txt(top + 490, big, 36, '#3b2533');
  const fresh: string[] = [];
  if (daily) {
    const [b, improved] = daily;
    fresh.push(`Daily best ${b.targets === 3 ? `${b.time}s` : `${b.targets}/3 + ${fmt(b.dmg)}`}${improved ? '  NEW!' : ''}  ·  new bench tomorrow`);
  }
  if (newBests.length) fresh.push(`New best: ${newBests.slice(0, 3).join(' · ')}`);
  if (pay?.onboarding) fresh.push('Includes a welcome gift of 12 Bolts');
  if (fresh.length) {
    c.add(scene.add.graphics().fillStyle(0xfff3c8, 1).fillRoundedRect(70, top + 535, W - 140, 40 + fresh.length * 38, 18));
    txt(top + 557 + (fresh.length * 38) / 2, fresh.join('\n'), 24, '#b06a1a');
  }
  const rec = s.daily ? null : s.remix ? (m.remixBest[`${s.target}:${scene.activeToys()[0] ?? 'none'}`] ?? null) : s.hard ? m.bestTimeHard : m.bestTime;
  const details = [`Biggest hit ${fmt(s.stats.biggestHit)}`, rec !== null ? `Record ${rec.toFixed(1)}s` : '', s.perks.length ? `Perks: ${s.perks.map((p) => PERKS[p].name).join(', ')}` : ''].filter(Boolean).join('  ·  ');
  txt(top + 720, details, 20, '#8a7a6a', 'Arial');
  scene.button(c, W / 2, top + 820, 520, 'ONE MORE!', 0xe8452c, () => scene.retry(), 1.15);
  scene.button(c, W / 2, top + 932, 260, 'HOME', 0x27a4c0, () => scene.openTitle(), 0.78);
}

/** r43 pride moment: before the level result, rebuild the board right before this attempt's biggest player chain
 *  (start state + command log, see core/replay) and play that chain back in slow motion (~3 s, tap to skip).
 *  A small self-contained board on its own layer: no sprites from the live board, no physics, a few dozen images. */
export function playBestChain(scene: GameScene, done: () => void) {
  const log = scene.runLog;
  const best = log.best;
  if (!best || best.count < 3) return done();
  let before: GameState | null = null;
  let cascade: CascadeResult | null = null;
  const a = log.actions[best.at];
  try {
    before = replayRun(log, best.at);
    if (before && a?.k === 'drop') {
      const after = JSON.parse(JSON.stringify(before)) as GameState;
      const e = applyCommand(after, a).events.find((x) => x.type === 'cascade');
      if (e?.type === 'cascade') cascade = e.result;
    }
  } catch {
    cascade = null;
  }
  // a replay that does not reproduce the recorded chain is never shown (no faked pride moment)
  if (!before || !cascade || a?.k !== 'drop' || cascade.count !== best.count) return done();
  tlog.log('best_chain_replay', { level: scene.s.level, count: best.count });

  const c = scene.add.container(0, 0).setDepth(100);
  scene.modal = c;
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.82).setInteractive();
  c.add(dim);
  const MC = 96;
  const ox = W / 2 - (COLS * MC) / 2, oy = H / 2 - (ROWS * MC) / 2 + 30;
  const at = (i: number) => ({ x: ox + (i % COLS) * MC + MC / 2, y: oy + Math.floor(i / COLS) * MC + MC / 2 });
  const bg = scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(ox - 14, oy - 14, COLS * MC + 28, ROWS * MC + 28, 24);
  for (let i = 0; i < ROWS * COLS; i++) bg.fillStyle(0xfbe7c6, 0.14).fillRoundedRect(at(i).x - MC / 2 + 4, at(i).y - MC / 2 + 4, MC - 8, MC - 8, 12);
  c.add(bg);
  const piece = (fam: Family, rank: number, i: number) => {
    const p = at(i);
    const key = `${fam}_${rank}`;
    const img = scene.add.image(p.x, p.y, scene.textures.exists(key) ? key : 'slot');
    img.setScale((MC - 14) / Math.max(img.width, img.height, 1));
    c.add(img);
    return img;
  };
  const views = new Map<number, Phaser.GameObjects.Image>();
  before.grid.forEach((g, i) => {
    if (g && i !== a.from && i !== a.to) views.set(i, piece(g.family, g.rank, i));
  });
  const ga = before.grid[a.from]!;
  const mover = piece(ga.family, ga.rank, a.from);
  const target = piece(ga.family, ga.rank, a.to);
  const links = scene.add.graphics();
  c.add(links);
  const title = scene.add.text(W / 2, oy - 70, 'YOUR BEST CHAIN', { fontFamily: 'Lilita One, Arial Black', fontSize: '44px', color: '#ffd24a' }).setOrigin(0.5);
  const counter = scene.add.text(W / 2, oy + ROWS * MC + 60, '', { fontFamily: 'Lilita One, Arial Black', fontSize: '64px', color: '#ffffff' }).setOrigin(0.5);
  const skip = scene.add.text(W / 2, H - 60, 'tap to skip', { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#c8b8a8' }).setOrigin(0.5);
  c.add([title, counter, skip]);

  let finished = false;
  const timers: Phaser.Time.TimerEvent[] = [];
  // one teardown for every close path: our own finish, closeModal() (e.g. the next level starting) or a direct
  // destroy (sheet()). Only finish() goes on to done(); an outside close means someone else moved on.
  const teardown = () => {
    if (finished) return false;
    finished = true;
    for (const t of timers) t.remove(false);
    scene.tweens.killTweensOf(c.list);
    dim.off('pointerdown').off('pointerup');
    return true;
  };
  c.once('modalclose', teardown);
  c.once('destroy', teardown);
  const finish = () => {
    if (!teardown()) return;
    if (scene.modal === c) scene.modal = null;
    c.destroy();
    done();
  };
  // Skip only on a press that STARTS on the dim: the tap that skipped the win show opens this replay mid-press,
  // and its release must not close it instantly.
  let pressed = false;
  dim.on('pointerdown', () => (pressed = true));
  dim.on('pointerup', () => pressed && finish());
  const later = (ms: number, fn: () => void) => timers.push(scene.time.delayedCall(ms, () => !finished && fn()));

  // 1) the merge slides in slowly (0.45 s), 2) each activation lights up in order (~2 s), 3) hold on the count
  const MERGE = 450;
  const p = at(a.to);
  scene.tweens.add({ targets: mover, x: p.x, y: p.y, duration: MERGE, ease: 'Quad.InOut' });
  later(MERGE, () => {
    mover.destroy();
    const key = `${ga.family}_${Math.min(ga.rank + 1, capOf(before!, ga.family))}`;
    if (scene.textures.exists(key)) target.setTexture(key).setScale((MC - 14) / Math.max(target.width, target.height, 1));
    views.set(a.to, target);
  });
  const acts = cascade.activations;
  const step = Math.min(300, 2000 / acts.length);
  acts.forEach((act, k) => {
    later(MERGE + 80 + k * step, () => {
      const q = at(act.idx);
      if (act.parent >= 0 && act.parent !== act.idx) {
        const f = at(act.parent);
        links.lineStyle(8, 0xffcf33, 0.85).lineBetween(f.x, f.y, q.x, q.y);
      }
      links.lineStyle(5, 0xffcf33, 1).strokeCircle(q.x, q.y, MC / 2 - 4);
      const v = views.get(act.idx);
      if (v && !REDUCED_MOTION) scene.tweens.add({ targets: v, scale: v.scale * 1.3, duration: Math.max(80, step * 0.5), yoyo: true, ease: 'Quad.Out' });
      counter.setText(`CHAIN x${k + 1}`);
      sfx.click();
    });
  });
  const end = MERGE + 80 + acts.length * step;
  later(end, () => {
    counter.setColor('#ffd24a');
    if (!REDUCED_MOTION) scene.tweens.add({ targets: counter, scale: 1.25, duration: 160, yoyo: true, ease: 'Back.Out' });
  });
  later(end + 650, finish);
}

/** SAGA level result: stars, Bolts (first clear / replay / new stars / eligible fail), free boosters, next step. */
export function openLevelResult(scene: GameScene, won: boolean) {
  scene.coach.clear();
  scene.closeInspect();
  scene.capsuleBtn?.setVisible(false);
  const s = scene.s;
  const m = scene.meta;
  const n = s.level!;
  const def = LEVELS[n - 1];
  if (!def) return scene.openTitle(); // a level this build no longer has: nothing to score, back home
  m.runs++;
  const key = String(n);
  const stars = (m.levelStars ??= {});
  const grants = (m.grants ??= {});
  const id = `L${n}:${s.seed}:${s.stats.merges}:${s.elapsed.toFixed(2)}`;
  const fresh = m.lastSettle !== id;
  m.lastSettle = id;
  const lines: string[] = [];
  let bolts = 0;
  const parts: string[] = [];
  let got = 0;
  let firstClear = false;
  let chapterDone = 0;
  if (won) {
    m.wins++;
    got = starsFor(def, s.elapsed);
    if (fresh) {
      scene.seasonEv('levelWin');
      if (s.stats.biggestChain >= 8) scene.seasonEv('chain8');
      if (got === 3) scene.seasonEv('threeStars');
    }
    const prev = stars[key] ?? 0;
    firstClear = prev === 0;
    const rw = levelReward(def);
    if (fresh) {
      // r46 ghost pace: the fastest win becomes the ghost (rebuilt from the run log; a log that doesn't replay to this win is not stored)
      const curve = paceFromLog(scene.runLog);
      if (curve && Math.abs(curve.t - s.elapsed) < 0.06) updatePace((m.levelPace ??= {}), key, curve);
      const lvB = firstClear ? rw.win_bolts + rw.first_clear_bolts : Math.min(rw.win_bolts, Math.floor(0.15 * s.elapsed));
      const stB = Math.max(0, got - prev) * rw.new_star_bolts;
      bolts += lvB + stB;
      parts.push(`${firstClear ? 'First clear' : 'Level'} +${lvB}`);
      // r40 Saga Mastery: contracts met in this win earn medals (+Bolts; every 10th a Wood crate, every 30th Iron, all = Gold)
      const medals = (m.sagaMedals ??= {});
      const doneHere = (medals[key] ??= []);
      contractsFor(def).forEach((ct, ci) => {
        if (doneHere.includes(ci) || !contractMet(ct, s)) return;
        doneHere.push(ci);
        scene.seasonEv('medal');
        bolts += MASTERY_BOLTS;
        const total = Object.values(medals).reduce((t, v) => t + v.length, 0);
        lines.push(`MASTERY \u2713 ${contractText(ct)}  +${MASTERY_BOLTS}`);
        if (total % 30 === 0) {
          scene.giveCrate('iron');
          lines.push(`${total} MASTERY MEDALS: +1 IRON CRATE`);
        } else if (total % 10 === 0) {
          scene.giveCrate('wood');
          lines.push(`${total} MASTERY MEDALS: +1 WOOD CRATE`);
        }
        if (total === LEVELS.length * 2) {
          scene.giveCrate('gold');
          lines.push('EVERY MEDAL! +1 GOLD CRATE');
        }
        tlog.log('mastery_medal', { level: n, contract: ct.kind, total });
      });
      if (firstClear && n === YARD_UNLOCK) lines.push('NEW EVENT: SCREW YARD!  (EVENTS tab)');
      if (stB) parts.push(`Stars +${stB}`);
      if (firstClear && rw.free_jumpstart && !grants[`kit${n}`]) {
        grants[`kit${n}`] = true;
        m.kits = (m.kits ?? 0) + rw.free_jumpstart;
        lines.push(`+${rw.free_jumpstart} Jumpstart Kit`);
      }
      if (firstClear && rw.free_time_capsule && !grants[`cap${n}`]) {
        grants[`cap${n}`] = true;
        m.capsules = (m.capsules ?? 0) + rw.free_time_capsule;
        lines.push(`+${rw.free_time_capsule} Time Capsule`);
      }
    }
    stars[key] = Math.max(prev, got);
    const total = Object.values(stars).reduce((a, b) => a + b, 0);
    if (total >= 25 && !grants.stars25) {
      grants.stars25 = true;
      m.kits = (m.kits ?? 0) + 1;
      lines.push('25 stars: +1 Jumpstart Kit');
    }
    if (total >= 50 && !grants.stars50) {
      grants.stars50 = true;
      m.capsules = (m.capsules ?? 0) + 1;
      lines.push('50 stars: +1 Time Capsule');
    }
    // r32 crates from play: mini-boss -> iron, chapter boss -> gold, every 3rd ordinary first clear -> wood
    if (fresh && firstClear) {
      const kind: CrateKind | null = def.mini_boss ? 'iron' : n % 10 === 0 ? 'gold' : n % 3 === 0 ? 'wood' : null;
      if (n % 10 === 0) {
        m.gems = (m.gems ?? 0) + GEM_REWARDS.chapterBoss;
        lines.push(`+${GEM_REWARDS.chapterBoss} GEMS`);
      }
      if (kind) {
        scene.giveCrate(kind);
        lines.push(`+1 ${CRATES[kind].name}`);
      }
    }
    if (firstClear && n % 10 === 0 && !(m.medals ??= {})[String(n / 10)]) {
      m.medals![String(n / 10)] = true;
      chapterDone = n / 10;
      tlog.log('chapter_reward_granted', { chapter: chapterDone });
    }
    if (n >= 5 && !m.hardUnlocked) m.hardUnlocked = true;
    // t-2fd7bb86: features open one at a time (unlocks.ts), each announced once here and tagged NEW where it lives
    for (const f of scene.checkUnlocks()) if (f !== 'gems') lines.push(`\u2605 NEW: ${FEATURE_INFO[f].name}  (${FEATURE_INFO[f].where}) \u2605`);
  } else if (fresh && s.elapsed >= 30 && s.stats.merges >= 3) {
    const day = localDate();
    const fp = (m.failPaid ??= {});
    if (fp[key] !== day) {
      fp[key] = day;
      bolts += 4;
      parts.push('Good try +4');
    }
  }
  if (fresh && !m.onboarded && (won || (s.elapsed >= 30 && s.stats.merges >= 3))) {
    m.onboarded = true;
    bolts += ONBOARDING_BOLTS;
    parts.push(`Welcome +${ONBOARDING_BOLTS}`);
  }
  m.bolts = (m.bolts ?? 0) + bolts;
  // mastery (the home machine) grows from this attempt's merges either way
  const mastery = (m.mastery ??= {});
  for (const [fam, r] of Object.entries(scene.runBest) as [Family, number][]) if (r > (mastery[fam] ?? 0)) mastery[fam] = r;
  m.bestChain = Math.max(m.bestChain, s.stats.biggestChain);
  tlog.log('level_end', { level: n, won, stars: got, elapsed: +s.elapsed.toFixed(1), bolts, jumpstart: !!s.jumpstart, capsule: !!s.capsuleUsed, firstClear });
  store(META_KEY, JSON.stringify(m));
  store(SAVE_KEY, null);
  won ? sfx.win() : sfx.lose();
  const PH = 860;
  const c = scene.panel(PH);
  const top = H / 2 - PH / 2;
  const head = won ? `LEVEL ${n} CLEAR!` : 'OUT OF TIME!';
  c.add(scene.add.text(W / 2, top + 80, head, { fontFamily: 'Lilita One, Arial Black', fontSize: '62px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 140, s.goal ? (won ? `${s.goal.kind === 'rank' ? `Rank ${s.goal.n} built` : `Chain x${s.goal.n} fired`} in ${s.elapsed.toFixed(1)}s` : `Best ${s.goal.kind === 'rank' ? 'rank' : 'chain x'}${s.goal.best} of ${s.goal.n}  ·  so close!`) : won ? (s.stage ? `${scene.stageCount()!.n} machines down in ${s.elapsed.toFixed(1)}s` : `${scene.monName()} down in ${s.elapsed.toFixed(1)}s`) : s.stage ? `Machine ${scene.stageCount()!.at} of ${scene.stageCount()!.n}  ·  ${scene.realBoss ? BOSSES[scene.realBoss.def].name : scene.monName()} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%` : `${scene.monName()} at ${Math.round((1 - s.hp / s.maxHp) * 100)}%  ·  so close!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a4a5a' }).setOrigin(0.5));
  // UI audit: a loss showed three ghost stars over a big empty gap; it now shows the sad-cannon art there instead
  if (!won && scene.hasArt('defeat')) {
    const im = scene.fitVisible(scene.add.image(W / 2, top + 296, 'defeat'), 240);
    const sc = im.scale;
    c.add(im.setScale(0));
    scene.tweens.add({ targets: im, scale: sc, duration: 300, delay: 150, ease: 'Back.Out' });
  } else for (let k = 0; k < 3; k++) {
    const st = scene.add.image(W / 2 + (k - 1) * 130, top + 270 + (k === 1 ? -14 : 0), 'star');
    const sc = (k === 1 ? 120 : 100) / Math.max(st.width, st.height);
    st.setScale(0).setAlpha(k < got ? 1 : 0.22);
    c.add(st);
    scene.tweens.add({ targets: st, scale: sc, duration: 260, delay: 200 + k * 220, ease: 'Back.Out', onStart: () => k < got && sfx.star(k) });
  }
  if (won && got < 3) c.add(scene.add.text(W / 2, top + 360, `Next star: clear in ${starGoals(def)[got === 1 ? 0 : 1]}s`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '20px', color: '#7a5a4a' }).setOrigin(0.5));
  // reward row: chain, then a bolt icon + the bolts (UI audit: rewards read as plain text)
  const big = { fontFamily: 'Lilita One, Arial Black', fontSize: '38px', color: '#3b2533' };
  const rowObjs: (Phaser.GameObjects.Text | Phaser.GameObjects.Image)[] = [];
  if (s.stats.biggestChain >= 2 && n >= 2) rowObjs.push(scene.add.text(0, 0, `Biggest chain x${s.stats.biggestChain}`, big));
  if (bolts > 0) {
    if (scene.hasArt('icon_bolt')) rowObjs.push(scene.fitVisible(scene.add.image(0, 0, 'icon_bolt'), 46));
    rowObjs.push(scene.add.text(0, 0, `+${bolts} BOLTS`, { ...big, color: '#b06a1a' }));
  }
  // the icon hugs its number; separate items get a wide gap
  const gapAt = (i: number) => (i === 0 ? 0 : rowObjs[i - 1] instanceof Phaser.GameObjects.Image ? 8 : 40);
  // the icon is centred on its visible pixels by fitVisible, so it takes a fixed 46 px slot
  const wOf = (o: Phaser.GameObjects.Text | Phaser.GameObjects.Image) => (o instanceof Phaser.GameObjects.Text ? o.width : 46);
  const rowW = rowObjs.reduce((w, o, i) => w + gapAt(i) + wOf(o), 0);
  let rx0 = W / 2 - rowW / 2;
  rowObjs.forEach((o, i) => {
    rx0 += gapAt(i);
    if (o instanceof Phaser.GameObjects.Text) o.setOrigin(0, 0.5).setPosition(rx0, top + 410);
    else o.setPosition(rx0 + 23, top + 410);
    c.add(o);
    rx0 += wOf(o);
  });
  if (bolts > 0) scene.time.delayedCall(250 + got * 220, () => sfx.boltRoll(Math.ceil(bolts / 6)));
  if (parts.length) c.add(scene.add.text(W / 2, top + 452, parts.join('  \u00b7  '), { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
  if (lines.length) {
    // r40: long reward lists (mastery, screwdriver, milestones) compress instead of running into the buttons
    const lh = lines.length > 3 ? 27 : 36;
    c.add(scene.add.graphics().fillStyle(0xfff3c8, 1).fillRoundedRect(70, top + 485, W - 140, 24 + lines.length * lh, 18));
    c.add(scene.add.text(W / 2, top + 497 + (lines.length * lh) / 2, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: lines.length > 3 ? '20px' : '24px', color: '#b06a1a', align: 'center', lineSpacing: lines.length > 3 ? 3 : 8 }).setOrigin(0.5));
  }
  if (chapterDone) scene.time.delayedCall(700, () => scene.playChapterChest(chapterDone));
  else if (won && n % 10 !== 0 && n > 1 && lines.length <= 2) {
    const left = 10 - (n % 10);
    c.add(scene.add.text(W / 2, top + 600, `${left} level${left > 1 ? 's' : ''} until your Chapter ${Math.ceil(n / 10)} chest`, { fontFamily: 'Lilita One, Arial Black', fontSize: '24px', color: '#7a5a4a' }).setOrigin(0.5));
  }
  const nextN = Math.min(LEVELS.length, n + 1);
  if (won) scene.button(c, W / 2, top + 690, 520, n < LEVELS.length ? `NEXT  LEVEL ${nextN}` : 'ROAD', 0x5fbf4a, () => (n < LEVELS.length ? scene.openLevelSheet(nextN) : scene.openTitle('road')), 1.1);
  else scene.button(c, W / 2, top + 690, 520, 'TRY AGAIN', 0xe8452c, () => scene.openLevelSheet(n), 1.1);
  // r37: a crate to open or a unit ready to level up gets its own button here (units are the main progression)
  // r38 Upgrade Prescription (ChatGPT review): after a loss, name the squad upgrade that helps most and how close it is
  const rx = !won ? scene.upgradePrescription() : null;
  if (rx) c.add(scene.add.text(W / 2, top + 572, rx.text, { fontFamily: 'Lilita One, Arial Black', fontSize: '25px', color: '#5a3a5a', align: 'center', lineSpacing: 4 }).setOrigin(0.5));
  // r38 trial over: point at the unit the player just tried
  const tr = scene.meta.trial;
  const trialEnd = tr && tr.date === localDate() && tr.on && tr.left === 0 && !tr.endShown ? unitDef(tr.unit) : undefined;
  if (trialEnd && tr) {
    tr.endShown = true;
    store(META_KEY, JSON.stringify(scene.meta));
  }
  const unitCta = trialEnd ? 'KEEP BUILDING' : scene.totalCrates() > 0 ? 'OPEN CRATE' : scene.unitsReady() ? 'LEVEL UP \u2191' : rx ? 'GET CARDS' : '';
  scene.button(c, unitCta ? W / 2 - 140 : W / 2, top + 800, 260, 'ROAD', 0x27a4c0, () => scene.openTitle('road'), 0.78);
  if (unitCta) scene.button(c, W / 2 + 140, top + 800, 260, unitCta, 0x8e58c9, () => (trialEnd ? scene.openUnitDetail(trialEnd) : unitCta === 'GET CARDS' ? scene.openUnitShop() : rx && unitCta.startsWith('LEVEL') ? scene.openUnitDetail(rx.u) : scene.openTitle('units')), 0.78);
}

/** Chapter chest (r17): closed chest -> crossfade open -> the chapter medal rises; tap to dismiss. */
export function playChapterChest(scene: GameScene, chapter: number) {
  const o = scene.add.container(0, 0).setDepth(140);
  o.add(scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.82).setInteractive());
  o.add(scene.add.text(W / 2, H / 2 - 360, `CHAPTER ${chapter} COMPLETE!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '56px', color: '#ffcf33', stroke: '#2b1d2e', strokeThickness: 10 }).setOrigin(0.5));
  const closed = scene.hasArt('chest_closed') ? scene.add.image(W / 2, H / 2, 'chest_closed') : null;
  const open = scene.hasArt('chest_open') ? scene.add.image(W / 2, H / 2, 'chest_open').setAlpha(0) : null;
  for (const im of [closed, open]) if (im) im.setScale(300 / Math.max(im.width, im.height));
  if (closed) o.add(closed);
  if (open) o.add(open);
  const medal = scene.medalIcon(W / 2, H / 2 - 40, 220, chapter, true).setAlpha(0).setScale(0.4);
  o.add(medal);
  const cap = scene.add.text(W / 2, H / 2 + 260, `Chapter ${chapter} medal added to your MACHINE\n(tap to continue)`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#fff0cf', align: 'center' }).setOrigin(0.5).setAlpha(0);
  o.add(cap);
  sfx.chestShake();
  if (closed) scene.tweens.add({ targets: closed, angle: { from: -4, to: 4 }, duration: 90, yoyo: true, repeat: 4 });
  scene.time.delayedCall(700, () => {
    sfx.chestOpen();
    scene.time.delayedCall(250, () => sfx.medal());
    if (closed) scene.tweens.add({ targets: closed, alpha: 0, duration: 200 });
    if (open) scene.tweens.add({ targets: open, alpha: 1, duration: 200 });
    scene.tweens.add({ targets: medal, alpha: 1, scale: 1, y: H / 2 - 170, duration: 520, ease: 'Back.Out' });
    scene.tweens.add({ targets: cap, alpha: 1, delay: 400, duration: 300 });
  });
  o.list[0].on('pointerup', () => {
    tlog.log('chapter_reward_presented', { chapter });
    o.destroy();
    scene.backupNudge(chapter);
  });
}

/** r43: after a chapter clear, offer a save backup once per chapter (dismissible; never blocks the level-end panel). */
export function backupNudge(scene: GameScene, chapter: number) {
  const m = scene.meta;
  if ((m.backupNudged ??= {})[String(chapter)]) return;
  m.backupNudged[String(chapter)] = true;
  store(META_KEY, JSON.stringify(m));
  tlog.log('backup_nudge', { chapter });
  const o = scene.add.container(0, 0).setDepth(140);
  const dim = scene.add.rectangle(W / 2, H / 2, W, H, 0x1a0f18, 0.6).setInteractive();
  const PH = 440;
  const top = H / 2 - PH / 2;
  o.add([dim, scene.add.graphics().fillStyle(0x2b1d2e, 1).fillRoundedRect(40, top - 6, W - 80, PH + 12, 36).fillStyle(0xfbe7c6, 1).fillRoundedRect(46, top, W - 92, PH, 32)]);
  o.add(scene.add.text(W / 2, top + 70, 'BACK UP YOUR PROGRESS?', { fontFamily: 'Lilita One, Arial Black', fontSize: '42px', color: '#3b2533' }).setOrigin(0.5));
  o.add(scene.add.text(W / 2, top + 120, `Chapter ${chapter} done! Your progress lives only on this phone.\nKeep a save code in Notes to get it back anytime.`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a', align: 'center', wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
  const close = () => o.destroy();
  dim.on('pointerup', close);
  scene.button(o, W / 2, top + 280, 460, 'COPY SAVE CODE', 0x5fbf4a, () => {
    close();
    scene.copySaveCode();
  }, 0.9);
  scene.button(o, W / 2, top + 380, 260, 'NOT NOW', 0x8a6a4a, close, 0.75);
}

export function openBountyResult(scene: GameScene, won: boolean) {
  const m = scene.meta;
  const bt = scene.s.bounty!;
  m.bounty = m.bounty ?? {};
  const rec = (m.bounty[bt.date] = m.bounty[bt.date] ?? { won: [], mastered: [] });
  let bolts = 0;
  const masteredNow = won && (scene.s.timeLeft >= MASTERY_TIME_LEFT || scene.s.stats.biggestChain >= MASTERY_CHAIN);
  let crate = false;
  if (won && !rec.won.includes(bt.slot)) {
    rec.won.push(bt.slot);
    scene.seasonEv('bountyWin');
    bolts += BOUNTY_BOLTS;
    scene.giveCrate('wood'); // r32
    crate = true;
    if (rec.won.length === 3) m.gems = (m.gems ?? 0) + GEM_REWARDS.allBounties; // all three bounties today
  }
  let newStar = false;
  if (masteredNow && !rec.mastered.includes(bt.slot)) {
    rec.mastered.push(bt.slot);
    m.bossMastery = { ...(m.bossMastery ?? {}), [bt.id]: (m.bossMastery?.[bt.id] ?? 0) + 1 };
    newStar = true;
    // r35: the third star wins the trophy; it goes straight onto the shelf when there is room
    if (m.bossMastery[bt.id] === TROPHY_AT) {
      if ((m.trophies ?? []).length < TROPHY_SHELF) m.trophies = [...(m.trophies ?? []), bt.id];
      scene.time.delayedCall(900, () => scene.showToast(`TROPHY WON: ${BOSSES.find((x) => x.id === bt.id)?.name ?? ''}!`));
      tlog.log('trophy', { id: bt.id });
    }
  }
  const total = Object.values(m.bossMastery ?? {}).reduce((a, b) => a + b, 0);
  let milestone = 0;
  for (const [need, pay] of MASTERY_MILESTONES) if (total >= need && (m.masteryPaid ?? 0) < need) {
    milestone += pay;
    m.masteryPaid = need;
  }
  bolts += milestone;
  if (bolts) m.bolts = (m.bolts ?? 0) + bolts;
  store(META_KEY, JSON.stringify(m));
  tlog.log('bounty_end', { id: bt.id, won, mastered: masteredNow, bolts });
  const c = scene.panel(640);
  const top = H / 2 - 320;
  const name = BOSSES.find((x) => x.id === bt.id)?.name ?? '';
  c.add(scene.add.text(W / 2, top + 64, won ? 'BOUNTY CLAIMED!' : 'BOUNTY ESCAPED', { fontFamily: 'Lilita One, Arial Black', fontSize: '48px', color: won ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
  const key = `boss_${bt.id}_intact`;
  if (scene.hasArt(key)) {
    const im = scene.add.image(W / 2, top + 210, key);
    im.setScale(170 / Math.max(im.width, im.height));
    if (!won) im.setAlpha(0.6);
    c.add(im);
  }
  const lines = [name, won ? (masteredNow ? `MASTERY ★  ${m.bossMastery?.[bt.id] ?? 1}` : `Master it: ${MASTERY_TIME_LEFT}s left or a x${MASTERY_CHAIN} chain`) : 'Try again any time today'];
  if (bolts) lines.push(`+${bolts} BOLTS${milestone ? '  (mastery milestone!)' : ''}${crate ? '  +1 WOOD CRATE' : ''}`);
  if (newStar) sfx.star?.(3);
  c.add(scene.add.text(W / 2, top + 320, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
  scene.button(c, W / 2 - 120, top + 540, 220, 'AGAIN', 0x5fbf4a, () => scene.startBounty(bt.slot), 0.85);
  scene.button(c, W / 2 + 120, top + 540, 220, 'EVENTS', 0x27a4c0, () => scene.openTitle('events'), 0.85);
}

export function openRushResult(scene: GameScene, won: boolean) {
  const m = scene.meta;
  const { id, slot, week } = scene.s.rush!;
  const r = m.rush;
  if (!r || r.week !== week) {
    // this week's rush record is gone (a reset or a loaded save): nothing to credit the fight against
    tlog.log('rush_record_missing', { opponent: id, index: slot });
    scene.rushRun = null;
    scene.openTitle('events');
    scene.showToast('BOSS RUSH RESET\nStart it again from EVENTS');
    return;
  }
  const run = scene.rushRun?.i === slot ? scene.rushRun : r.run?.i === slot ? { i: slot, times: [...r.run.times] } : { i: slot, times: [] };
  if (won) {
    run.times.push(scene.s.elapsed);
    r.stamps = { ...(r.stamps ?? {}), [id]: true };
    tlog.log('rush_fight_finish', { index: run.i, opponent: id, clear_time: +scene.s.elapsed.toFixed(1) });
  }
  const cleared = run.times.length;
  const done = !won || cleared >= 3;
  // weekly cumulative Bolts: only the positive difference is paid
  const due = cleared ? RUSH_REWARDS[cleared - 1] : 0;
  const delta = Math.max(0, due - (r.granted ?? 0));
  if (delta) {
    // r32: crossing fight 2 / fight 3 for the first time this week also drops a crate
    if ((r.granted ?? 0) < RUSH_REWARDS[1] && due >= RUSH_REWARDS[1]) scene.giveCrate('iron');
    if ((r.granted ?? 0) < RUSH_REWARDS[2] && due >= RUSH_REWARDS[2]) {
      scene.giveCrate('gold');
      m.gems = (m.gems ?? 0) + GEM_REWARDS.rushFull;
      scene.seasonBonus(BONUS_XP.rushFull, 'BOSS RUSH');
    }
    m.bolts = (m.bolts ?? 0) + delta;
    r.granted = due;
  }
  const firstMedal = cleared >= 3 && !r.medal;
  if (cleared >= 3) {
    r.medal = true;
    r.weeks = [...new Set([...(r.weeks ?? []), r.week])];
  }
  const total = run.times.reduce((a, b) => a + b, 0);
  if (done && cleared && (!r.best || cleared > r.best.fights || (cleared === r.best.fights && total < r.best.time))) r.best = { fights: cleared, time: total };
  store(META_KEY, JSON.stringify(m));
  const c = scene.panel(760);
  const top = H / 2 - 380;
  c.add(scene.add.text(W / 2, top + 64, done ? (cleared >= 3 ? 'RUSH COMPLETE!' : 'RUSH OVER') : `FIGHT ${cleared} CLEARED!`, { fontFamily: 'Lilita One, Arial Black', fontSize: '50px', color: cleared >= 3 ? '#e8452c' : '#3b2533' }).setOrigin(0.5));
  r.course.forEach((bid, k) => {
    const x = W / 2 + (k - 1) * 190, y = top + 230;
    const key = `boss_${bid}_intact`;
    if (scene.hasArt(key)) {
      const im = scene.add.image(x, y, key);
      im.setScale(140 / Math.max(im.width, im.height));
      if (k >= cleared) im.setTint(k === cleared && !done ? 0xffffff : 0x2b1d2e).setAlpha(k === cleared && !done ? 1 : 0.6);
      c.add(im);
    }
    if (k < cleared) c.add(scene.add.text(x + 50, y + 50, '✓', { fontFamily: 'Arial Black', fontSize: '44px', color: '#2a8a3a', stroke: '#fff0cf', strokeThickness: 6 }).setOrigin(0.5));
    c.add(scene.add.text(x, y + 96, BOSSES.find((b) => b.id === bid)?.name ?? '', { fontFamily: 'Lilita One, Arial Black', fontSize: '19px', color: '#3b2533', align: 'center', wordWrap: { width: 180 } }).setOrigin(0.5, 0));
  });
  const lines = [`${cleared} of 3 fights  \u00b7  ${total.toFixed(1)}s`, delta ? `+${delta} BOLTS` : `This week: ${r.granted}/${RUSH_REWARDS[2]} Bolts`];
  if (firstMedal) lines.push('BOSS RUSH MEDAL EARNED!');
  c.add(scene.add.text(W / 2, top + 400, lines.join('\n'), { fontFamily: 'Lilita One, Arial Black', fontSize: '30px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
  if (!done) {
    const nextId = r.course[cleared];
    scene.button(c, W / 2, top + 600, 440, 'NEXT FIGHT', 0x5fbf4a, () => {
      run.i = cleared;
      scene.rushRun = run;
      scene.startRushFight(cleared);
    });
    c.add(scene.add.text(W / 2, top + 545, `Next: ${BOSSES.find((b) => b.id === nextId)?.name ?? ''}`, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
  } else {
    scene.button(c, W / 2 - 120, top + 640, 220, 'AGAIN', 0x5fbf4a, () => scene.startRush(), 0.85);
    scene.button(c, W / 2 + 120, top + 640, 220, 'HOME', 0x27a4c0, () => scene.quitHome(), 0.85);
    tlog.log('rush_attempt_end', { completed: cleared, total: +total.toFixed(1) });
    if (delta) tlog.log('rush_settle', { delta, week: r.week });
  }
}

export function openPuzzleResult(scene: GameScene, won: boolean) {
  const m = scene.meta;
  const pz = scene.puzzleRec();
  const def = scene.puzzleDef;
  if (!def || def.id !== scene.s.puzzle?.id) return scene.openTitle('events'); // never reached via startPuzzle; a guard, not a flow
  const kind = scene.puzzleKind;
  const lines: string[] = [];
  let firstSolve = false;
  notePuzzleAttempt(pz, def.id, won);
  // r44: the first solve pays; the highlight hint is free, a shown merge halves it (rewards are once per puzzle/day)
  const rw = puzzleReward(kind, pz.shown?.includes(def.id) ? 'move' : 'none');
  const halved = rw.bolts < puzzleReward(kind, 'none').bolts;
  if (won && kind === 'daily' && pz.lastSolved !== localDate()) {
    firstSolve = true;
    const yesterday = new Date(Date.now() - 86400000);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    pz.streak = pz.lastSolved === y ? pz.streak + 1 : 1;
    pz.lastSolved = localDate();
    m.bolts = (m.bolts ?? 0) + rw.bolts;
    m.gems = (m.gems ?? 0) + rw.gems;
    lines.push(`+${rw.bolts} BOLTS  +${rw.gems} GEM${rw.gems === 1 ? '' : 'S'}`, `STREAK: ${pz.streak} day${pz.streak > 1 ? 's' : ''}`);
  } else if (won && kind === 'drill' && !pz.drills.includes(def.id)) {
    firstSolve = true;
    pz.drills.push(def.id);
    m.bolts = (m.bolts ?? 0) + rw.bolts;
    if (def.unit) scene.applyCards([{ unit: def.unit as Family, count: rw.cards, isNew: false }]);
    lines.push(`+${rw.bolts} BOLTS  +${rw.cards} ${FAMILY_INFO[def.unit as 'cannon'].name.toUpperCase()} CARD${rw.cards === 1 ? '' : 'S'}`);
  } else if (won) lines.push('Solved again - nice!');
  if (firstSolve && halved) lines.push('(half reward: a move was shown)');
  if (won) pz.shown = pz.shown?.filter((id) => id !== def.id);
  store(META_KEY, JSON.stringify(m));
  // r43: first solves (the rewarded ones) feed the Season, so replays can't farm it
  if (firstSolve) scene.seasonEv('puzzleSolve');
  tlog.log('puzzle_end', { id: def.id, won, fails: pz.fails?.[def.id] ?? 0 });
  const help = puzzleHelp(pz.fails?.[def.id] ?? 0, kind);
  const c = scene.panel(640);
  const top = H / 2 - 320;
  const helpLine = help.showMove ? 'Stuck? NEXT MOVE shows a right merge.' : help.hint ? 'Stuck? HINT lights the part to move first.' : `A hint unlocks after ${HELP.hintAfter - (pz.fails?.[def.id] ?? 0)} more ${HELP.hintAfter - (pz.fails?.[def.id] ?? 0) === 1 ? 'try' : 'tries'}.`;
  c.add(scene.add.text(W / 2, top + 70, won ? 'SOLVED!' : 'NOT QUITE', { fontFamily: 'Lilita One, Arial Black', fontSize: '58px', color: won ? '#8e58c9' : '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 150, won ? lines.join('\n') : `The machine had ${fmt(Math.max(0, Math.round(scene.s.hp)))} HP left.\nThe order of merges matters - and which\npiece you drop onto which.\n${helpLine}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
  const nextDrill = won && kind === 'drill' && def.unit ? (PUZZLES.drills[def.unit] ?? []).find((p) => !pz.drills.includes(p.id)) : undefined;
  if (nextDrill) scene.button(c, W / 2, top + 440, 420, 'NEXT DRILL', 0x8e58c9, () => scene.startPuzzle(nextDrill, 'drill'), 0.95);
  else if (!won) {
    const tryX = help.hint ? W / 2 - 130 : W / 2;
    scene.button(c, tryX, top + 440, help.hint ? 240 : 320, 'TRY AGAIN', 0xe8452c, () => scene.startPuzzle(def, kind), 0.85);
    if (help.hint) scene.button(c, W / 2 + 130, top + 440, 240, help.showMove ? 'NEXT MOVE' : 'HINT', 0x8e58c9, () => (scene.closeModal(), scene.startPuzzle(def, kind), scene.puzzleHelpTap()), 0.85);
  }
  const back = () => scene.openTitle(kind === 'drill' ? 'units' : 'events');
  // skip: drills only (no reward, no Season credit). The daily has a streak and a reward, and the hints already get you there.
  if (!won && help.skip) {
    scene.button(c, W / 2 - 130, top + 550, 240, 'SKIP DRILL', 0x8a6a4a, () => scene.skipDrill(def), 0.78);
    scene.button(c, W / 2 + 130, top + 550, 240, 'UNITS', 0x27a4c0, back, 0.78);
  } else scene.button(c, W / 2, top + 550, 260, kind === 'drill' ? 'UNITS' : 'EVENTS', 0x27a4c0, back, 0.78);
}

export function openEndlessResult(scene: GameScene, won: boolean) {
  const m = scene.meta;
  const rec = scene.endlessRec();
  const floor = scene.s.endless!;
  const lines: string[] = [];
  if (won) {
    const first = floor > rec.best;
    const rw = endlessReward(floor, first);
    m.bolts = (m.bolts ?? 0) + rw.bolts;
    lines.push(`+${rw.bolts} BOLTS${first ? '' : '  (replay)'}`);
    if (rw.crate) {
      scene.giveCrate(rw.crate);
      lines.push(`+1 ${rw.crate.toUpperCase()} CRATE`);
    }
    rec.best = Math.max(rec.best, floor);
    scene.seasonEv('levelWin');
    scene.seasonEv('endlessFloor');
    if (scene.s.stats.biggestChain >= 8) scene.seasonEv('chain8');
    rec.floor = floor + 1;
    const toBlock = 10 - endlessPos(rec.floor) + 1;
    lines.push(endlessPos(rec.floor) === 10 ? 'Next: a BOSS floor!' : endlessPos(rec.floor) === 5 ? 'Next: a MINI-BOSS floor!' : `${toBlock} floor${toBlock > 1 ? 's' : ''} to the next boss`);
  }
  store(META_KEY, JSON.stringify(m));
  tlog.log('endless_end', { floor, won, best: rec.best });
  const c = scene.panel(720);
  const top = H / 2 - 360;
  c.add(scene.add.text(W / 2, top + 70, won ? `FLOOR ${floor} CLEARED!` : `FLOOR ${floor}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '52px', color: won ? '#8e58c9' : '#3b2533' }).setOrigin(0.5));
  c.add(scene.add.text(W / 2, top + 130, `ENDLESS ROAD  \u00b7  best floor ${rec.best}`, { fontFamily: 'Lilita One, Arial Black', fontSize: '26px', color: '#7a5a4a' }).setOrigin(0.5));
  const rx = !won ? scene.upgradePrescription() : null;
  const body = won ? lines.join('\n') : `Out of time. Try the floor again${rx ? `\n\n${rx.text}` : ''}`;
  c.add(scene.add.text(W / 2, top + 200, body, { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#5a3a3a', align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0));
  scene.button(c, W / 2, top + 540, 460, won ? `NEXT  \u00b7  FLOOR ${rec.floor}` : 'TRY AGAIN', won ? 0x8e58c9 : 0xe8452c, () => scene.startEndless(), 1.0);
  scene.button(c, W / 2, top + 640, 260, 'ROAD', 0x27a4c0, () => scene.openTitle('road'), 0.78);
}
