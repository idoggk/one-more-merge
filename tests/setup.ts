import { afterEach } from 'vitest';

// Many tests are seconds of synchronous CPU (solver, roster fuzz, replays). Tests of one file run back to
// back on microtasks, so the worker never serves its IPC socket: vitest's onTaskUpdate call to the main
// process then gets no reply within 60 s on a busy machine and the run ends with "Errors 1 error" although
// every test passed. One macrotask turn after each test lets the worker answer.
afterEach(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
