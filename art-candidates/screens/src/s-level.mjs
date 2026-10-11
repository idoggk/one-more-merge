import { art, btn, pill, pips, rib, bar, star, spark, motes, statusBar, nav, panelRivets, iconClose, rng, px } from './lib.mjs';
import { topbar } from './s-home.mjs';

/* ============================================================================================
   IN-LEVEL HUD (also the blurred backdrop of win / lose)
   ============================================================================================ */
// 5 columns x 6 rows. [row, col, art, extra]
const HUD_BOARD = [
  [0, 0, 'bell_2'], [0, 2, 'coil_2'], [0, 4, 'horn_1'],
  [1, 1, 'cannon_2'], [1, 3, 'magnet_2'],
  [2, 0, 'bell_3', 'ring'], [2, 2, 'coil_3'], [2, 3, 'cannon_2', 'charged'],
  [3, 1, 'cannon_3'], [3, 3, 'cannon_4', 'merge'],
  [4, 0, 'fan_2'], [4, 2, 'bell_2'], [4, 4, 'battery_1'],
  [5, 1, 'cannon_3', 'drag'], [5, 3, 'cannon_3', 'target'],
];
const CELL = 64;
const GAP = 4;
const cxy = (r, c) => [8 + c * (CELL + GAP) + CELL / 2, 8 + r * (CELL + GAP) + CELL / 2];

function hudBoard(live = true) {
  const cells = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const u = HUD_BOARD.find((b) => b[0] === r && b[1] === c);
      const idx = r * 5 + c;
      const x = u?.[3];
      const rank = u ? Number(u[2].split('_').pop()) : 0;
      const marks = [
        x === 'merge' ? '<i class="mk-merge"></i><i class="mk-merge m2"></i>' : '',
        x === 'charged' ? '<i class="mk-ch"></i><span class="mk-chb">x1.5</span>' : '',
        x === 'ring' ? '<i class="mk-bell"></i><i class="mk-bell b2"></i>' : '',
        x === 'target' ? '<i class="mk-tgt"></i>' : '',
      ].join('');
      cells.push(`<div class="hc ${x === 'drag' ? 'is-drag' : ''}" style="--d:${(-((idx * 0.41) % 2.8)).toFixed(2)}s">
        ${art('slot', CELL + 2, CELL + 2, 'hc-slot')}${marks}
        ${u ? `<div class="hc-u">${art(u[2], 76, 76, 'hc-art')}${art(`dice_${Math.min(rank, 6)}`, 30, 14, 'hc-rank')}</div>` : ''}
      </div>`);
    }
  }
  const P = (r, c) => cxy(r, c);
  const [bx, by] = P(2, 0);
  const [cx0, cy0] = P(2, 2);
  const [cx1, cy1] = P(2, 3);
  const zig = (x0, y0, x1, y1, n = 6, amp = 6) => {
    const pts = [`${x0},${y0}`];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const s = i % 2 ? 1 : -1;
      pts.push(`${(x0 + (x1 - x0) * t).toFixed(1)},${(y0 + (y1 - y0) * t + s * amp).toFixed(1)}`);
    }
    pts.push(`${x1},${y1}`);
    return pts.join(' ');
  };
  const links = live
    ? `<svg class="hlinks" viewBox="0 0 ${8 * 2 + 5 * CELL + 4 * GAP} ${8 * 2 + 6 * CELL + 5 * GAP}">
      <polyline class="lk" stroke="#f2b521" style="color:#f2b521" points="${bx + 16},${by - 2} ${cx0 - 18},${cy0 - 2}"/>
      <polyline class="lk" stroke="#27c4e0" style="color:#27c4e0;animation-duration:.5s" points="${zig(cx0 + 12, cy0, cx1 - 14, cy1, 5, 7)}"/>
    </svg>`
    : '';
  const [dx, dy] = P(5, 2);
  const drag = live ? `<div class="hdrag" style="left:${dx - 38}px;top:${dy - 56}px">${art('cannon_3', 80, 80)}<i class="gshadow" style="left:8px;bottom:-10px;width:64px;height:16px"></i></div>` : '';
  const tags = live ? `<span class="jobtag" style="left:${cx0 - 38}px;top:${cy0 - 56}px">DEPTH x1.48</span>` : '';
  return `<div class="hboard"><div class="hb-tray">${panelRivets}<div class="hb-grid">${cells.join('')}</div>${links}${drag}${tags}</div></div>`;
}

function hudInner(opts = {}) {
  const live = opts.live !== false;
  return `<div class="hud-bg"></div><div class="grain"></div>
    ${statusBar()}
    <div class="h-top">
      <a class="pausebtn">${art('icon_pause', 44, 44)}</a>
      <div class="lvplate"><b class="dk">LEVEL 12</b><span class="dk2">MACHINE 2 OF 3</span></div>
      <div class="clock">${art('icon_timer', 40, 40, 'clk-ic')}<b>1:12</b></div>
    </div>
    <div class="stage">
      <div class="stg-bg a-stage_ch2"></div><div class="stg-vig"></div>
      ${live ? '<div class="stg-flash"></div>' : ''}
      <div class="stg-floor"></div>
      <div class="mon-wrap"><i class="gshadow" style="left:14px;bottom:2px;width:130px;height:22px"></i>${art('mon_sock_cyclops', 150, 144, 'mon')}</div>
      <div class="chase"><span class="cs-st">${star(true, 18)}${star(true, 18)}${star(true, 18, 'cs-pulse')}</span><b>0:24</b></div>
      <div class="chain"><span class="cx">x7</span><small>CHAIN</small><em>+9,420</em></div>
      ${live ? `<span class="dmg d1">1,284</span><span class="dmg d2">2,960</span><span class="dmg d3 crit">6,420!</span>` : ''}
      ${live ? spark(300, 40, 14, 0.4) + spark(120, 90, 11, 1.2) : ''}
    </div>
    <div class="hp-wrap">
      <div class="hp-name">SOCK CYCLOPS</div>
      ${bar(62, 'g', { lag: 70, h: 26, ticks: [] })}
      <div class="hp-num">4,898 <small>/ 7,900</small></div>
    </div>
    ${hudBoard(live)}
    <div class="tray">
      <div class="tp next"><b class="dk">NEXT</b><span class="tp-u">${art('cannon_1', 40, 40)}${art('coil_1', 30, 30, 'tp-u2')}</span></div>
      <div class="cap"><span class="cap-in">${art('booster_time_capsule', 40, 40)}</span><b>+15s</b></div>
      <div class="tp scrap">${art('icon_scrap', 36, 36)}<span class="tp-t"><b class="dk">SCRAP</b><small class="dk2">x3</small></span></div>
    </div>`;
}

function hudScreen() {
  return { id: 'hud', group: 'level', title: 'In-level HUD', note: 'Header with pause, level plate and clock. Stage with monster, star-chase chip, chain counter (x5-x7 yellow on the Bible ladder), damage numbers. HP bar with gloss, shine and lag trail. 5x6 board with real units, merge ring, charged mark, chain links, a dragged part with its merge preview. Next / capsule / scrap tray.', html: `<div class="hud">${hudInner()}</div>` };
}

/* ============================================================================================
   WIN
   ============================================================================================ */
function reward(icon, n, label, delay) {
  return `<div class="rw well" style="--d:${delay}s"><div class="rw-ic">${art(icon, 40, 40)}</div><b class="rw-n">+<span class="count" style="--to:${n};--d:${delay + 0.1}s;--cd:.6s"></span></b><small class="dk2">${label}</small></div>`;
}

function winScreen() {
  const coins = Array.from({ length: 7 }, (_, i) => {
    const r = rng(40 + i);
    const sx = 85 + i * 36 + r() * 12;
    const sy = 560 + r() * 14;
    return `<i class="coin" style="left:${px(sx)};top:${px(sy)};--dx:${px(86 - sx)};--dy:${px(70 - sy)};--d:${(2.35 + i * 0.07).toFixed(2)}s;--cx:${px((r() - 0.5) * 120)}">${art('icon_bolt', 30, 30)}</i>`;
  }).join('');
  const rc = rng(2024);
  const cols = ['#ffd23a', '#ff5a3a', '#4ab0ff', '#62e083', '#ffffff', '#b890ff'];
  const confetti = Array.from({ length: 36 }, (_, i) => {
    const a = (-170 + rc() * 160) * (Math.PI / 180);
    const d = 70 + rc() * 150;
    const x = Math.cos(a) * d;
    const y = Math.sin(a) * d * 0.8;
    return `<i class="cf" style="left:195px;top:176px;background:${cols[i % cols.length]};--x:${px(x)};--y:${px(y)};--fx:${px(x * 1.25)};--fy:${px(y + 330 + rc() * 120)};--r:${Math.round(180 + rc() * 360)}deg;--d:${(0.95 + rc() * 0.35).toFixed(2)}s;--w:${px(5 + rc() * 4)}"></i>`;
  }).join('');
  const html = `<div class="win">
    <div class="bk">${hudInner({ live: false })}</div>
    <div class="dim win-dim"></div>
    <i class="halo wn-halo" style="--hc:255,214,90"></i>
    ${motes(18, 8, 390, 844, { top: 0.1 })}
    <div class="wpanel panel">${panelRivets}
      <div class="w-rays"><i class="rays" style="left:50%;top:-6px;width:300px;height:300px;margin-left:-150px;opacity:.7"></i></div>
      <div class="w-rib">${rib('VICTORY!', 'prime', '', '')}</div>
      <div class="w-mascot">${art('victory', 150, 150)}${spark(26, 24, 16, 0.2)}${spark(250, 30, 13, 0.8)}${spark(214, 130, 15, 1.3)}</div>
      <div class="w-name dk">SOCK CYCLOPS DEFEATED</div>
      <div class="w-stars"><span style="--d:.8s" class="s s1">${star(true, 62)}</span><span style="--d:1.02s" class="s s2">${star(true, 78)}</span><span style="--d:1.24s" class="s s3">${star(true, 62)}</span>
        <i class="sring" style="left:62px;--d:.8s"></i><i class="sring" style="left:152px;--d:1.02s"></i><i class="sring" style="left:242px;--d:1.24s"></i>
        ${spark(60, 6, 14, 0.9)}${spark(150, -8, 16, 1.1)}${spark(236, 6, 14, 1.3)}</div>
      <div class="w-time"><span class="dk2">TIME</span><b class="dk">0:52</b><span class="chip r-prime nb">NEW BEST!</span></div>
      <div class="w-rw">
        ${reward('icon_bolt', 24, 'WIN', 1.7)}${reward('icon_bolt', 12, 'FIRST CLEAR', 1.85)}${reward('star', 6, 'NEW STARS', 2.0)}
      </div>
      <div class="w-btns">
        ${btn('HOME', 'blue', 'sm')}
        ${btn('NEXT LEVEL', 'prime', 'lg', 'sweep')}
      </div>
    </div>
    <div class="confetti">${confetti}</div>
    <div class="topfront">${statusBar()}${topbar({ bolts: '1,2<span class="count2" style="--from:40;--to:76;--d:2.4s;--cd:.7s"></span>' })}</div>
    ${coins}
  </div>`;
  return { id: 'win', stage: true, group: 'level', title: 'Level win', note: 'Staged: panel pops, ribbon drops, three stars pop 220 ms apart with sparkles, time and rewards count up, bolts fly to the pill, buttons appear last (about 3 s). Press replay.', html };
}

/* ============================================================================================
   LOSE (calm: desaturated board, no shake, no red flash)
   ============================================================================================ */
function loseScreen() {
  const html = `<div class="lose">
    <div class="bk">${hudInner({ live: false })}</div>
    <div class="dim lose-dim"></div>
    <div class="lpanel panel">${panelRivets}
      <div class="l-rib">${rib('SO CLOSE!', 'blue', '')}</div>
      <div class="l-mascot">${art('defeat', 140, 140)}<i class="gshadow" style="left:22px;bottom:2px;width:100px;height:16px"></i></div>
      <div class="l-name dk">SOCK CYCLOPS HAS 18% LEFT</div>
      <div class="l-bar">${bar(18, 'r', { h: 22, lag: 18 })}</div>
      <div class="l-tip well"><div class="lt-u">${art('coil_3', 46, 46)}</div><div class="lt-t"><b class="dk">TRY THIS</b><span class="dk2">Put a Coil next to your Cannons for longer chains.</span></div></div>
      <div class="l-try"><span class="chip r-go nb">${art('icon_bolt', 16, 16)}+6 bolts for trying</span></div>
      <div class="l-btns">
        ${btn('HOME', 'blue', 'sm')}
        ${btn('ONE MORE!', 'prime', 'lg', 'sweep')}
      </div>
    </div>
    <div class="topfront">${statusBar()}${topbar()}</div>
  </div>`;
  return { id: 'lose', stage: true, group: 'level', title: 'Level lose', note: 'Calm: the board drains to 40% colour, no shake or red flash, encouraging copy, how close you were, one concrete tip, a small consolation reward. ONE MORE! is the primary button.', html };
}

/* ============================================================================================
   PRE-LEVEL CARD (opens from a road node)
   ============================================================================================ */
function preScreen() {
  const html = `<div class="pre">
    <div class="bk"><div class="road"><div class="layer rd-bg a-road_bg"></div><div class="layer rd-tint"></div></div></div>
    <div class="dim pre-dim"></div>
    ${statusBar()}
    <div class="ppanel panel">${panelRivets}
      <div class="p-rib">${rib('LEVEL 12', 'blue', '')}</div>
      <button class="rbtn r-red p-x" aria-label="Close">${iconClose(18)}</button>
      <div class="p-mons">
        <div class="pm"><i class="gshadow" style="left:6px;bottom:0;width:62px;height:12px"></i>${art('mon_colander_clatter', 66, 66)}<small class="pm-t">1</small></div>
        <svg class="pm-ar" viewBox="0 0 20 20" width="22" height="22"><use href="#i-chev"/></svg>
        <div class="pm goal"><i class="gshadow" style="left:10px;bottom:0;width:90px;height:14px"></i>${art('mon_sock_cyclops', 92, 88)}<small class="pm-t goal-t">GOAL</small></div>
      </div>
      <div class="p-name dk">SOCK CYCLOPS</div>
      <div class="p-goal well"><span class="g-ic">${art('medal', 30, 30)}</span><span class="dk">Build a <b class="rk">RANK 4</b> machine to break the last one.</span></div>
      <div class="p-stars">
        ${[['Clear', 1], ['Under 1:16', 2], ['Under 0:57', 3]].map(([t, n], i) => `<div class="ps"><span class="ps-s">${star(false, 46)}</span><b class="dk">${t}</b></div>`).join('')}
      </div>
      <div class="p-good well"><span class="dk2">GOOD HERE</span>${art('coil_3', 30, 30)}${art('magnet_2', 30, 30)}<b class="dk">Coil, Magnet</b></div>
      <div class="p-kit well"><div class="pk-ic">${art('booster_jumpstart', 40, 40)}</div><div class="pk-t"><b class="dk">Jumpstart Kit <em>x2</em></b><span class="dk2">Start with rank 2 shooters</span></div><i class="tog on"></i></div>
      <div class="p-rw"><span class="chip r-prime nb">${art('icon_bolt', 16, 16)}FIRST CLEAR +12</span><span class="chip r-go nb">${star(true, 14)}NEW STAR +3</span></div>
      <div class="p-play">${btn('PLAY', 'prime', 'xl', 'sweep breathe')}</div>
    </div>
  </div>`;
  return { id: 'prelevel', group: 'level', title: 'Pre-level card', note: 'Machines in the level with the goal machine flagged, the goal in plain words, three star goals, a GOOD HERE unit tip, the Jumpstart Kit toggle, reward hints and one big Play.', html };
}

/* ============================================================================================
   REWARD POPUP (new unit)
   ============================================================================================ */
function rewardScreen() {
  const html = `<div class="rwp">
    <div class="rp-bg"></div>
    <i class="halo rp-halo" style="--hc:154,99,255"></i>
    <i class="rays rp-rays" style="left:50%;top:50%;width:620px;height:620px;margin:-340px 0 0 -310px;--rc:255,238,168"></i>
    ${motes(22, 77, 390, 844, { top: 0.1 })}
    ${statusBar()}
    <div class="rp-card panel q-epic">${panelRivets}
      <div class="rc-rib">${rib('NEW UNIT!', 'purple', '')}</div>
      <div class="rc-stage">
        <i class="halo" style="--hc:154,99,255;left:50%;top:50%;width:260px;height:260px;margin:-130px 0 0 -130px"></i>
        <div class="rc-item"><i class="gshadow" style="left:40px;bottom:6px;width:150px;height:24px"></i>${art('arc_welder_4', 210, 210)}</div>
        ${spark(40, 46, 18, 0.3)}${spark(240, 36, 15, 0.9)}${spark(262, 150, 17, 1.4)}${spark(30, 160, 13, 0.6)}${spark(150, 8, 14, 1.1)}
      </div>
      <div class="rc-name"><b>ARC WELDER</b></div>
      <div class="rc-tags"><span class="chip r-purple nb">EPIC</span><span class="chip r-red nb">${art('role_shooter', 14, 14)}SHOOTER</span></div>
      <div class="rc-job dk2">Welds a bright arc to the strongest touching machine.</div>
      <div class="rc-rank"><span class="dk2">RANK</span>${pips(1, 6)}</div>
      <div class="rc-btn">${btn('CLAIM', 'prime', 'xl', 'sweep')}</div>
    </div>
  </div>`;
  return { id: 'reward', stage: true, group: 'moments', title: 'Reward popup', note: 'New-unit reveal: dim, rotating shine behind the item, item pops 0 to 1.3 to 1.0, rarity chip, short job line, Claim appears last.', html };
}

/* ============================================================================================
   CRATE OPENING (4 moments: shake, burst, reveal, collect)
   ============================================================================================ */
const TILES = [
  ['cannon_2', 'common', 'x2'], ['coil_2', 'common', 'x3'], ['bell_2', 'common', 'x2'], ['horn_2', 'common', 'x1'],
  ['fan_2', 'common', 'x2'], ['battery_2', 'rare', 'x1'], ['rocket_2', 'rare', 'x1'], ['magnet_2', 'rare', 'x2'],
  ['mortar_2', 'rare', 'x1'], ['saw_blade_3', 'epic', 'x1'], ['arc_welder_4', 'epic', 'NEW'], ['more', 'more', '+9'],
];
function crateOpenScreen() {
  const tiles = TILES.map(([a, q, n], i) => {
    const t = 1.35 + i * 0.28 + (q === 'epic' ? 0.25 : 0) + (a === 'arc_welder_4' ? 0.25 : 0);
    if (q === 'more') return `<div class="ot more" style="--t:${t.toFixed(2)}s"><b>+9</b><small>MORE</small></div>`;
    const isNew = n === 'NEW';
    return `<div class="ot q-${q} ${q === 'epic' ? 'big' : ''}" style="--t:${t.toFixed(2)}s"><i class="ot-f"></i>${art(a, 62, 62, 'ot-a')}${isNew ? '<span class="new" style="left:-8px;top:-6px;transform:rotate(-8deg)">NEW</span>' : `<span class="ot-n">${n}</span>`}${q === 'epic' ? `<i class="ot-ring"></i>${spark(8, 8, 12, 0)}` : ''}</div>`;
  }).join('');
  const html = `<div class="copen">
    <div class="co-bg"></div>
    <i class="halo co-glow" style="--hc:154,99,255;left:50%;top:360px;width:520px;height:520px;margin:-260px 0 0 -260px"></i>
    <i class="rays co-rays" style="left:50%;top:360px;width:640px;height:640px;margin:-320px 0 0 -320px"></i>
    ${motes(20, 31, 390, 844, { top: 0.15 })}
    ${statusBar()}
    <div class="co-title">${rib('TOOL CHEST', 'purple', '')}<small>20 PARTS · EPIC OR BETTER</small></div>
    <div class="co-crate"><i class="gshadow" style="left:36px;bottom:-4px;width:190px;height:30px"></i>${art('crate_chest', 250, 250)}</div>
    <div class="co-hint"><span>OPENING</span></div>
    <div class="co-grid">${tiles}</div>
    <div class="co-sum"><span class="chip r-purple nb">1 NEW</span><span class="chip r-go nb">3 UPGRADES READY</span></div>
    <div class="co-skip">TAP TO SKIP</div>
    <div class="co-btns">${btn('COLLECT', 'prime', 'lg', 'sweep')}${btn('OPEN ANOTHER x2', 'go', 'sm')}</div>
    <div class="co-flash"></div>
  </div>`;
  return { id: 'crate-open', stage: true, group: 'moments', title: 'Crate opening', note: 'Tool Chest: anticipation shake with a growing rarity glow, white flash and light burst, parts appear 280 ms apart in rarity tiles (rarer = longer pause, bigger pop), buttons last. Frames at 0.4 s, 1.1 s, 2.6 s, 5.4 s.', html };
}

export function levelScreens() {
  return [preScreen(), hudScreen(), winScreen(), loseScreen()];
}
export function momentScreens() {
  return [crateOpenScreen(), rewardScreen()];
}
