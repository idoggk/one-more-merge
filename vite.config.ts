/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true, port: 5173 },
  // Phaser (~1.4 MB) in its own chunk: it changes far less often than the game code, so it stays cached across deploys
  build: { rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/phaser') ? 'phaser' : undefined) } } },
  // Tests are seeded and deterministic, but a few heavy ones (solver brute force,
  // boss/resume replays) run 3-4x slower on a busy machine. 5 s default was flaky.
  test: { testTimeout: 20_000 },
});
