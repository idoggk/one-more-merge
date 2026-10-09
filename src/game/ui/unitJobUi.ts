// Unit card copy block (job word + WHEN MERGED line from content/unitJobs.ts) for the Units page card, the crate
// reveal card and the unit detail page. Only draws; GameScene calls it with the card container.
import Phaser from 'phaser';
import { unitJob } from '../../content/unitJobs';

const FONT = 'Lilita One, Arial Black';

/** Job pill at (x, y) and the WHEN MERGED line under it, centred, inside `parent`. `size` = the line's font size. */
export function addUnitJob(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, id: string, level: number, x: number, y: number, width: number, size = 12) {
  const j = unitJob(id, level);
  if (!j) return;
  parent.add(scene.add.text(x, y, j.job, { fontFamily: FONT, fontSize: `${size + 3}px`, color: '#ffffff', backgroundColor: '#8e58c9', padding: { x: 8, y: 1 } }).setOrigin(0.5));
  if (j.merged) parent.add(scene.add.text(x, y + size + 3, j.merged, { fontFamily: 'Arial', fontStyle: 'bold', fontSize: `${size}px`, color: '#3b2533', align: 'center', wordWrap: { width }, lineSpacing: 0 }).setOrigin(0.5, 0));
}

/** Detail page: the WHEN MERGED line alone (the job word sits in the role line). */
export function addMergedLine(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, id: string, level: number, x: number, y: number, width: number) {
  const m = unitJob(id, level)?.merged;
  if (m) parent.add(scene.add.text(x, y, m, { fontFamily: FONT, fontSize: '24px', color: '#8e58c9', align: 'center', wordWrap: { width } }).setOrigin(0.5, 0));
}
