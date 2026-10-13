// t-4c676288 LAST MERGES (TUNING.mergeBudget): scene side of src/core/budget.ts. The run is the Workshop Puzzle path with a saga look;
// this file only starts it and shows its result. No Bolts, no meta progress, no unlocks (nothing is saved).
import { TUNING } from '../../content/tuning';
import { budgetPuzzleDef, budgetStars, mergesLeft, type BudgetLevel } from '../../core/budget';
import * as tlog from '../../platform/telemetry';
import { sfx } from '../audio';
import type { GameScene } from '../GameScene';
import { H, W, fmt } from '../sceneKit';

export function startBudget(scene: GameScene, b: BudgetLevel) {
  if (!TUNING.mergeBudget) return scene.showToast('BUDGET LEVELS ARE OFF  ·  QA TOOLS');
  scene.closeModal();
  scene.budgetDef = b;
  tlog.log('budget_start', { id: b.id, merges: b.merge_budget, hp: b.hp });
  scene.startPuzzle(budgetPuzzleDef(b), 'daily');
}

/** The card that opens a budget level (replaces the puzzle's "win in N" card). */
export const budgetIntro = (b: BudgetLevel) =>
  `LAST ${b.merge_budget} MERGES\nBreak the machine (${fmt(b.hp)} HP) in ${b.merge_budget} merges.\n${'★'.repeat(3)} ${b.star_spare[1]}+ spare  ·  ${'★'.repeat(2)} ${b.star_spare[0]}+ spare\nNo clock - only your merges count!`;

export function openBudgetResult(scene: GameScene, won: boolean) {
  const b = scene.budgetDef;
  const s = scene.s;
  if (!b || s.puzzle?.id !== budgetPuzzleDef(b).id) return scene.openTitle();
  const spare = mergesLeft(s);
  const stars = won ? budgetStars(spare, s.puzzle.budget?.spare ?? b.star_spare) : 0;
  tlog.log('budget_end', { id: b.id, won, spare, stars });
  won ? sfx.win() : sfx.lose();
  const c = scene.panel(700);
  const top = H / 2 - 350;
  const say = (y: number, t: string, size: number, color: string) => c.add(scene.add.text(W / 2, y, t, { fontFamily: 'Lilita One, Arial Black', fontSize: `${size}px`, color, align: 'center', lineSpacing: 8, wordWrap: { width: W - 150 } }).setOrigin(0.5, 0));
  say(top + 40, won ? `${scene.monName()} DEFEATED!` : 'OUT OF MERGES', 52, won ? '#e8452c' : '#3b2533');
  say(top + 170, '★'.repeat(stars) + '☆'.repeat(3 - stars), 84, '#e8a317');
  const hpLeft = Math.max(0, Math.round(s.hp));
  say(top + 290, won ? `${spare} merge${spare === 1 ? '' : 's'} to spare\n${stars === 3 ? 'Perfect plan!' : `${stars === 2 ? '3' : '2'} stars: win with ${s.puzzle.budget!.spare[stars === 2 ? 1 : 0]}+ spare`}` : `The machine had ${fmt(hpLeft)} HP left (${Math.round((100 * hpLeft) / s.maxHp)}%).\nThe order of your merges matters.`, 28, '#5a3a3a');
  scene.button(c, W / 2, top + 480, 420, won ? 'PLAY AGAIN' : 'TRY AGAIN', 0xe8452c, () => scene.startBudget(b), 0.95);
  scene.button(c, W / 2, top + 590, 260, 'HOME', 0x27a4c0, () => scene.openTitle(), 0.78);
}
