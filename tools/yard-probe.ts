// r36 probe: difficulty of generated Screw Yards. Greedy = sensible player; random = taps any free screw.
import { BOX_SIZE, generateYard, newYard, removable, tapScrew, yardParams } from '../src/core/screw';
import { Rng } from '../src/core/rng';
for (const n of [1, 3, 5, 8, 12, 16, 20]) {
  let maxTray = 0, randWins = 0, screws = 0;
  const N = 60;
  for (let k = 0; k < N; k++) {
    const lvl = generateYard(n, 1000 + k * 31);
    screws += lvl.screws.length;
    // greedy (tracks tray peak)
    const st = newYard(lvl);
    while (!st.won && !st.lost) {
      const free = lvl.screws.filter((s) => removable(st, s.id));
      const fit = free.find((s) => st.boxes.some((b) => b && b.color === s.color && b.n < BOX_SIZE));
      const soon = (c: number) => { const i = lvl.queue.indexOf(c, st.qi); return i < 0 ? 999 : i; };
      tapScrew(st, (fit ?? free.slice().sort((a, b) => soon(a.color) - soon(b.color))[0]).id);
      maxTray = Math.max(maxTray, st.tray.length);
    }
    // random tapper
    const rs = newYard(lvl), rng = new Rng(k + 5);
    while (!rs.won && !rs.lost) {
      const free = lvl.screws.filter((s) => removable(rs, s.id));
      tapScrew(rs, free[rng.int(free.length)].id);
    }
    if (rs.won) randWins++;
  }
  console.log(`yard ${n} ${JSON.stringify(yardParams(n))} screws ~${(screws / N).toFixed(0)}  greedy tray peak ${maxTray}  random tapper wins ${((randWins / N) * 100).toFixed(0)}%`);
}
