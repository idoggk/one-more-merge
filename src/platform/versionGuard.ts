// Launch-version guard: a phone must never run (or crash on) a half-old build. Pure decisions here, the browser
// plumbing (fetch / sessionStorage / reload) in the small functions below. See docs/design/LAUNCH_VERSION_FIX.md.

declare const __BUILD_ID__: string;

const RELOAD_KEY = 'omm.verReloadAt';
/** One self-reload per this window: a broken deploy must never turn into a reload loop. */
export const RELOAD_WINDOW_MS = 60_000;

/** True when the live build id is known and differs from the running one. */
export function isNewerBuild(running: string, live: unknown): boolean {
  return typeof live === 'string' && live.length > 0 && running !== 'dev' && live !== running;
}

/** True when a self-reload is allowed now (none in the last RELOAD_WINDOW_MS). */
export function mayReload(lastAt: number, now: number): boolean {
  return lastAt <= 0 || !(now - lastAt >= 0 && now - lastAt < RELOAD_WINDOW_MS);
}

/** A failed <script>/<link> load of one of our hashed files (stale index.html pointing at a removed chunk). */
export function isAssetLoadFailure(tag: string | undefined, url: string | undefined): boolean {
  return (tag === 'SCRIPT' || tag === 'LINK') && !!url && url.includes('/assets/');
}

/** Reload with a cache-busting query, dropping service workers and caches first. At most once per window. */
export async function reloadOnce(now = Date.now()): Promise<boolean> {
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (!mayReload(last, now)) return false;
    sessionStorage.setItem(RELOAD_KEY, String(now));
  } catch {
    /* no storage: allow the single reload */
  }
  try {
    if ('serviceWorker' in navigator) await Promise.all((await navigator.serviceWorker.getRegistrations()).map((r) => r.unregister()));
    if ('caches' in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
  } catch {
    /* reload anyway */
  }
  const u = new URL(location.href);
  u.searchParams.set('v', String(now));
  location.replace(u.toString());
  return true;
}

/** Boot-time hooks: reload once when a chunk/preload fails, and when version.json says a newer build is live. */
export function installVersionGuard(): void {
  const running = typeof __BUILD_ID__ === 'string' ? __BUILD_ID__ : 'dev';
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    void reloadOnce();
  });
  window.addEventListener('unhandledrejection', (e) => {
    if (/dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(String((e.reason as Error | undefined)?.message ?? e.reason))) void reloadOnce();
  });
  if (running === 'dev' || !navigator.onLine) return;
  fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { id?: unknown } | null) => {
      if (j && isNewerBuild(running, j.id)) void reloadOnce();
    })
    .catch(() => undefined);
}
