/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { execSync } from 'node:child_process';

// 'YYYY-MM-DD HH:mm · abc1234' (local time); date only when git is unavailable. Tests get a fixed value.
function buildId(): string {
  if (process.env.VITEST) return '2026-01-01 00:00 · test000';
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  try {
    const sha = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    return sha ? `${stamp} · ${sha}` : stamp;
  } catch {
    return stamp;
  }
}

export default defineConfig({
  base: './',
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  server: { host: true, port: 5173 },
  // Phaser (~1.4 MB) in its own chunk: it changes far less often than the game code, so it stays cached across deploys
  build: { rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } } },
  // Tests are seeded and deterministic, but a few heavy ones (solver brute force,
  // boss/resume replays) run 3-4x slower on a busy machine. 5 s default was flaky.
  test: { testTimeout: 20_000 },
});
