// r39 audit (ChatGPT review: "a boss may remix mechanics, but may not teach one"): for every boss / mini-boss level,
// where each of its attacks was first seen before it (mini-boss attack, light behaviour, or an earlier boss).
import { LEVELS } from '../src/content/levels';
import { BOSSES, chapterBossIdx } from '../src/core/boss';

const seenAt = new Map<string, number[]>();
const see = (atk: string, lv: number) => seenAt.set(atk, [...(seenAt.get(atk) ?? []), lv]);
for (const d of LEVELS) {
  const boss = d.level % 10 === 0 ? BOSSES[chapterBossIdx(d.level)] : d.mini_boss ? BOSSES.find((b) => b.id === d.mini_boss) : undefined;
  if (boss) {
    const notes = [boss.attack, boss.second].filter(Boolean).map((a) => {
      const before = (seenAt.get(a!) ?? []).filter((l) => l < d.level);
      return `${a}: ${before.length ? `seen ${before.join(',')}` : 'NEW HERE'}`;
    });
    console.log(`L${d.level} ${boss.name}${boss.mini ? ' (mini)' : ''}  ${notes.join('  |  ')}`);
    see(boss.attack, d.level);
    if (boss.second) see(boss.second, d.level);
  }
  if (d.behaviour && d.behaviour !== 'shield') see(d.behaviour, d.level);
}
