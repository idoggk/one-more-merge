import '@fontsource/lilita-one';
import Phaser from 'phaser';
import { computeLayout, GameScene, layoutHeight, W } from './game/GameScene';

async function boot() {
  // make sure canvas text uses the real font from the first frame (never block more than 1.5 s)
  await Promise.race([document.fonts.load('40px "Lilita One"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  const H = computeLayout(window.innerWidth, window.innerHeight);
  // a big aspect change (rotation, window resize) rebuilds the layout; the run is saved on hide/reload
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (Math.abs(layoutHeight(window.innerWidth, window.innerHeight) - H) > 60) location.reload();
    }, 400);
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f3cf9b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: W, height: H },
    input: { activePointers: 1 },
    // dev aid: ?timer keeps the loop running in hidden/background tabs (automated checks)
    fps: new URLSearchParams(location.search).has('timer') || (window as unknown as { __OMM_TIMER?: boolean }).__OMM_TIMER ? { forceSetTimeOut: true, target: 60 } : undefined,
    scene: [GameScene],
  });
  // expose for debugging / automated checks
  (window as unknown as { __omm: unknown }).__omm = { Phaser, game };
}

void boot();
