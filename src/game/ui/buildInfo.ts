// Build label + RELOAD LATEST for the Settings screen. Lets the owner tell which build the phone is running and
// force the freshest copy. Never touches localStorage: the save and meta live there.
import Phaser from 'phaser';

declare const __BUILD_ID__: string;

/** 'Build 2026-10-10 10:30 · 54b2585' from the injected id. */
export function formatBuildLabel(id: string): string {
  return `Build ${id}`;
}

/** Url with the cache-busting `v` query set (replaces an earlier one), hash kept. */
export function bustUrl(href: string, now: number): string {
  const u = new URL(href);
  u.searchParams.set('v', String(now));
  return u.toString();
}

/** Unregister service workers and clear Cache Storage, then reload with ?v=<time>. Save data is left alone. */
export async function reloadLatest(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    // reload anyway
  }
  location.replace(bustUrl(location.href, Date.now()));
}

/** Small build text with a RELOAD LATEST link, centred at (x, y) inside `parent`. */
export function addBuildInfo(scene: Phaser.Scene, parent: Phaser.GameObjects.Container, x: number, y: number) {
  const id = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
  parent.add(scene.add.text(x, y, formatBuildLabel(id), { fontFamily: 'Arial', fontStyle: 'bold', fontSize: '22px', color: '#7a5a4a' }).setOrigin(0.5));
  const b = scene.add.text(x, y + 52, 'RELOAD LATEST', { fontFamily: 'Lilita One, Arial Black', fontSize: '28px', color: '#b06a1a' }).setOrigin(0.5);
  b.setPadding(24, 14).setInteractive({ useHandCursor: true });
  b.on('pointerup', () => {
    b.setText('RELOADING…').disableInteractive();
    void reloadLatest();
  });
  parent.add(b);
}
