// 'So close' lose text (rival-games study #11; presentation only, no streak or economy change).
// Estimates how many more merges the run needed: HP still standing (this machine + the ones after it)
// over the run's average damage per merge (player-merge damage / player merges; passive shots, kickback and
// carried overkill are left out, so they never inflate the per-merge average).

export type SoCloseInput = {
  hp: number;
  maxHp: number;
  /** Staged levels: every machine's HP and the index of the one on screen. */
  stage?: { i: number; hps: number[] };
  /** Damage from player merges only (stats.dmgBy.player). */
  playerDamage: number;
  merges: number;
};

/** Merges still needed, or null when the run gives no fair average (no merges or no damage yet). */
export function mergesAway(o: SoCloseInput): number | null {
  if (o.merges <= 0 || o.playerDamage <= 0) return null;
  const later = o.stage ? o.stage.hps.slice(o.stage.i + 1).reduce((a, b) => a + b, 0) : 0;
  const left = Math.max(0, o.hp) + later;
  return Math.max(1, Math.ceil(left / (o.playerDamage / o.merges)));
}

/** e.g. 'Machine 4/4 at 8% HP  ·  about 2 merges away'. `name` is used when there are no stages. */
export function soCloseText(o: SoCloseInput, name: string): string {
  const pct = Math.max(1, Math.round((Math.max(0, o.hp) / Math.max(1, o.maxHp)) * 100));
  const who = o.stage ? `Machine ${o.stage.i + 1}/${o.stage.hps.length}` : name;
  const n = mergesAway(o);
  const away = n === null ? 'so close!' : n === 1 ? 'about 1 merge away' : `about ${n} merges away`;
  return `${who} at ${pct}% HP  ·  ${away}`;
}

/** Shrinks a one-line text until it fits `width` (never below 18 px). */
export function fitLine<T extends { width: number; style: { fontSize: string | number }; setFontSize(s: number): unknown }>(t: T, width: number): T {
  let fs = Number.parseInt(String(t.style.fontSize));
  while (t.width > width && fs > 18) t.setFontSize((fs -= 2));
  return t;
}
