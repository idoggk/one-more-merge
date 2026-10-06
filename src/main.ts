import '@fontsource/lilita-one';
import Phaser from 'phaser';
import { computeLayout, GameScene, layoutHeight, setRenderScale, W } from './game/GameScene';

async function boot() {
  // make sure canvas text uses the real font from the first frame (never block more than 1.5 s)
  await Promise.race([document.fonts.load('40px "Lilita One"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  // embedded frames (claude.ai artifact) can report a 0-height viewport for a moment: wait for a real size (max 1.5 s)
  for (let i = 0; i < 30 && (window.innerHeight < 300 || window.innerWidth < 200); i++) await new Promise((r) => setTimeout(r, 50));
  const H = computeLayout(window.innerWidth, window.innerHeight);
  // render at the phone's real pixel density (sharp art + text), capped for fill-rate
  const cssW = Math.min(window.innerWidth, (window.innerHeight * W) / H);
  const RS = Math.min(2, Math.max(1, ((window.devicePixelRatio || 1) * cssW) / W));
  const forced = Number(new URLSearchParams(location.search).get('rs')); // dev: ?rs=2 to test the high-DPI path
  setRenderScale(forced > 0 ? forced : RS);
  // Rebuild the layout only when the orientation really flips. Mobile address bars change the height all the
  // time, so height changes alone must never reload (that caused an endless reload/blink loop on phones).
  const portrait = () => window.innerHeight >= window.innerWidth;
  const bootPortrait = portrait();
  let resizeT = 0;
  window.addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = window.setTimeout(() => {
      if (window.innerHeight < 300 || portrait() === bootPortrait) return;
      if (Math.abs(layoutHeight(window.innerWidth, window.innerHeight) - H) < 60) return;
      let last = 0;
      try {
        last = Number(sessionStorage.getItem('omm.reloadAt') || 0);
        sessionStorage.setItem('omm.reloadAt', String(Date.now()));
      } catch {
        /* no storage: still allow one reload */
      }
      if (Date.now() - last > 10000) location.reload();
    }, 500);
  });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f3cf9b',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: Math.round(W * (forced > 0 ? forced : RS)), height: Math.round(H * (forced > 0 ? forced : RS)) },
    input: { activePointers: 1 },
    // dev aid: ?timer keeps the loop running in hidden/background tabs (automated checks)
    fps: new URLSearchParams(location.search).has('timer') || (window as unknown as { __OMM_TIMER?: boolean }).__OMM_TIMER ? { forceSetTimeOut: true, target: 60 } : undefined,
    scene: [GameScene],
  });
  // expose for debugging / automated checks
  (window as unknown as { __omm: unknown }).__omm = { Phaser, game };
}

void boot();
