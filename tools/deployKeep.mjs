// Pure helpers for tools/deploy.mjs: keep the hashed files of the last few builds on gh-pages, so a phone that still
// holds an older index.html (HTTP cache, CDN edge, service worker) can load the chunks that page points at.

/** Builds kept on the site in total (the new one plus the previous KEEP_BUILDS - 1). */
export const KEEP_BUILDS = 4;

/**
 * history: [{ id, files }] newest first, as read from the live builds.json (may be undefined / malformed).
 * Returns the new history (capped) and the old files to copy into dist (those not already in the new build).
 */
export function planKeep(history, newBuild, keep = KEEP_BUILDS) {
  const prev = Array.isArray(history)
    ? history.filter((b) => b && typeof b.id === 'string' && Array.isArray(b.files) && b.id !== newBuild.id)
    : [];
  const kept = [newBuild, ...prev].slice(0, Math.max(1, keep));
  const have = new Set(newBuild.files);
  const copy = new Set();
  for (const b of kept.slice(1)) for (const f of b.files) if (!have.has(f)) copy.add(f);
  return { history: kept, copy: [...copy].sort() };
}
