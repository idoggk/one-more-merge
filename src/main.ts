import '@fontsource/lilita-one';
import Phaser from 'phaser';
import { GameScene, H, W } from './game/GameScene';

async function boot() {
  // make sure canvas text uses the real font from the first frame (never block more than 1.5 s)
  await Promise.race([document.fonts.load('40px "Lilita One"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f3cf9b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    input: { activePointers: 1 },
    scene: [GameScene],
  });
  // expose for debugging / automated checks
  (window as unknown as { __omm: unknown }).__omm = { Phaser, game };
}

void boot();
