// A save write failed because the browser's storage is full: say so (once a minute at most) instead of failing silently.
let lastAt = -Infinity;

export function warnStorageFull(now = Date.now()) {
  if (now - lastAt < 60_000) return false;
  lastAt = now;
  try {
    if (typeof document === 'undefined') return true;
    const el = document.createElement('div');
    el.setAttribute('role', 'alert');
    el.textContent = "Storage is full: your progress couldn't be saved.\nFree some space, or copy your save code in Settings.";
    el.style.cssText =
      "position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:1001;max-width:90vw;box-sizing:border-box;padding:10px 16px;background:#d8261a;color:#fff;border:3px solid #2b1d2e;border-radius:14px;font:bold 15px Arial,sans-serif;text-align:center;white-space:pre-line;pointer-events:none";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6000);
  } catch {
    /* never throw from a warning */
  }
  return true;
}
