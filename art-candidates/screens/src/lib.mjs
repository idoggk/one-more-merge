// Markup helpers shared by all mockup screens. Pure functions that return HTML strings (build time, no runtime JS).
import path from 'node:path';
import sharp from 'sharp';

const dir = path.dirname(new URL(import.meta.url).pathname);
export const ART_DIR = path.resolve(dir, '..', '..', '..', 'src', 'assets', 'art');

/** natural pixel size of a shipped picture (used to lay out the layered home machine) */
const sizeCache = new Map();
export async function sizeOf(name) {
  if (!sizeCache.has(name)) {
    const m = await sharp(path.join(ART_DIR, `${name}.webp`)).metadata();
    sizeCache.set(name, { w: m.width, h: m.height });
  }
  return sizeCache.get(name);
}

/** small seeded PRNG so the built page is identical on every build */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const px = (n) => `${Math.round(n * 100) / 100}px`;

/** one picture from src/assets/art (embedded by the build as .a-<key>) */
export function art(name, w, h = w, cls = '', style = '') {
  return `<i class="art a-${name} ${cls}" style="width:${px(w)};height:${px(h)};${style}"></i>`;
}

/** star (on = gold enamel, off = empty dark slot) */
export function star(on, s = 34, cls = '', style = '') {
  return `<svg class="star ${cls}" viewBox="0 0 100 96" style="--s:${s}px;${style}"><use href="#st-${on ? 'on' : 'off'}"/></svg>`;
}

export function spark(x, y, s = 14, d = 0, t = 1.8, extra = '') {
  return `<svg class="spk" viewBox="0 0 20 20" style="left:${px(x)};top:${px(y)};--s:${px(s)};--d:${d}s;--t:${t}s;${extra}"><use href="#spk"/></svg>`;
}

/** floating dust motes inside a box (seeded) */
export function motes(n, seed, w, h, opts = {}) {
  const r = rng(seed);
  const out = [];
  const top = opts.top ?? 0.3;
  for (let i = 0; i < n; i++) {
    const s = 3 + r() * 6;
    out.push(
      `<i style="left:${px(r() * w)};top:${px(h * (top + r() * (1 - top)))};--s:${px(s)};--t:${(8 + r() * 8).toFixed(1)}s;--d:${(-r() * 14).toFixed(1)}s;--dx:${px((r() - 0.5) * 50)}"></i>`,
    );
  }
  return `<div class="motes">${out.join('')}</div>`;
}

export function statusBar(light = true) {
  return `<div class="sb ${light ? '' : 'sb-dk'}"><b>9:41</b><span class="sb-r"><i class="sig"></i><i class="wifi"></i><i class="batt"><u></u></i></span></div>`;
}

/** painted-style gear (settings) */
export const iconGear = (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 40 40"><use href="#i-gear"/></svg>`;
export const iconClose = (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><use href="#i-x"/></svg>`;
export const iconBack = (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 20 20"><use href="#i-back"/></svg>`;

/** button: role = prime | go | blue | red | grey | purple, size = '' | xl | lg | sm */
export function btn(label, role = 'prime', size = '', extra = '', style = '') {
  return `<button class="btn r-${role} ${size} ${extra}" style="${style}"><b><span>${label}</span></b></button>`;
}

export function pill(icon, text, plus = false, style = '') {
  return `<div class="pill" style="${style}">${art(icon, 38, 38, 'ic')}<b>${text}</b>${plus ? '<span class="plus">+</span>' : ''}</div>`;
}

export function pips(n, max = 6, cls = '') {
  return `<span class="pips ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? '' : 'e'}"></i>`).join('')}</span>`;
}

export function bar(p, color = 'g', opts = {}) {
  const lag = opts.lag ?? p;
  const ticks = (opts.ticks ?? []).map((t) => `<i class="tick" style="left:${t}%"></i>`).join('');
  return `<div class="bar hp-${color} ${opts.cls ?? ''}" style="--p:${p}%;--lp:${lag}%;--h:${opts.h ?? 22}px;${opts.style ?? ''}"><div class="trk">${lag > p ? '<i class="lag"></i>' : ''}<i class="fill"></i>${ticks}</div></div>`;
}

export function rib(label, role = 'blue', cls = '', style = '') {
  return `<div class="rib r-${role} ${cls}" style="${style}"><i></i><span>${label}</span></div>`;
}

export const panelRivets = '<i class="rv tl"></i><i class="rv tr"></i><i class="rv bl"></i><i class="rv br"></i>';

/** the 5-tab bottom nav. active = machine | units | home | crates | events */
export const TABS = [
  { id: 'machine', label: 'MACHINE', art: 'unit_wrench', dot: false },
  { id: 'units', label: 'UNITS', art: 'coil_3', dot: true },
  { id: 'home', label: 'HOME', art: 'cannon_3', dot: false },
  { id: 'crates', label: 'CRATES', art: 'crate_toolbox', count: 2 },
  { id: 'events', label: 'EVENTS', art: 'medal', dot: true, star: true },
];
export function nav(active) {
  const tabs = TABS.map((t) => {
    const on = t.id === active;
    const badge = t.count ? `<b class="cnt" style="right:6px;top:2px">${t.count}</b>` : t.dot && !on ? '<i class="dot" style="right:12px;top:6px"></i>' : '';
    return `<a class="tab ${on ? 'on' : ''}" data-tab="${t.id}">
      ${on ? '<i class="tab-glow"></i>' : ''}
      <span class="tab-knob">${art(t.art, on ? 46 : 36, on ? 46 : 36, 'tab-ic')}${t.star ? star(true, on ? 19 : 15, 'tab-star') : ''}</span>
      <em>${t.label}</em>${badge}
    </a>`;
  }).join('');
  return `<nav class="nav"><div class="nav-bar"></div><div class="nav-tabs">${tabs}</div></nav>`;
}

/** Layered hero machine (same mount maths as src/game/machine.ts buildMachine, assembly space 1000x800). */
const MOUNTS = {
  shooter: { x: 250.61, y: 516.8, fit: [260, 250] },
  coil: { x: 386.56, y: 434.94, fit: [220, 270] },
  bell: { x: 775.71, y: 497.17, fit: [230, 260] },
  helper: { x: 629.72, y: 571.84, fit: [210, 210] },
};
const TIER_FIT = [0, 0.68, 0.84, 1];
export async function machine({ width = 360, finish = null, ranks = { cannon: 5, coil: 3, bell: 3 }, helper = 'fan', helperRank = 3, cls = '' } = {}) {
  const k = width / 1000;
  const tierOf = (r) => (r >= 5 ? 3 : r >= 3 ? 2 : 1);
  const parts = [];
  const chassis = finish ? `hero_chassis_${finish}` : 'hero_chassis';
  parts.push(art(chassis, 920, 372, 'm-ch', 'left:40px;top:400px'));
  const slots = [
    ['coil', 'coil', ranks.coil ?? 0],
    ['bell', 'bell', ranks.bell ?? 0],
    ['shooter', 'cannon', ranks.cannon ?? 0],
    ['helper', helper, helper ? helperRank : 0],
  ];
  for (const [mount, fam, rank] of slots) {
    if (!fam || !rank) continue;
    const t = tierOf(rank);
    const key = `hm_${fam}_${t}`;
    const nat = await sizeOf(key);
    const m = MOUNTS[mount];
    const sc = Math.min((m.fit[0] * TIER_FIT[t]) / nat.w, (m.fit[1] * TIER_FIT[t]) / nat.h);
    const w = nat.w * sc;
    const h = nat.h * sc;
    parts.push(art(key, w, h, `m-p m-${fam}`, `left:${px(m.x - w / 2)};top:${px(m.y + 22 - h)}`));
  }
  return `<div class="mach ${cls}" style="width:${px(1000 * k)};height:${px(800 * k)}"><div class="mach-in" style="transform:scale(${k.toFixed(4)})">${parts.join('')}</div></div>`;
}

/** painted rarity card frame wrapper helpers */
export const RARITY = {
  common: { cls: 'q-common', name: 'COMMON', frame: 'card_common' },
  rare: { cls: 'q-rare', name: 'RARE', frame: 'card_rare' },
  epic: { cls: 'q-epic', name: 'EPIC', frame: 'card_epic' },
  legend: { cls: 'q-legend', name: 'LEGENDARY', frame: 'card_epic' },
};

/** SVG defs shared by every screen (star, sparkle, icons, gradients). */
export function makeDefs() {
  const R = 47;
  const r = 22;
  const cx = 50;
  const cy = 52;
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
  }
  const star = `M${pts.join('L')}Z`;
  const small = [];
  for (let i = 0; i < 10; i++) {
    const rad = (i % 2 === 0 ? R : r) * 0.62;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    small.push(`${(cx - 3 + rad * Math.cos(a)).toFixed(1)},${(cy - 4 + rad * Math.sin(a)).toFixed(1)}`);
  }
  const smallStar = `M${small.join('L')}Z`;
  // gear: 8 teeth
  const gp = [];
  for (let i = 0; i < 16; i++) {
    const a0 = (i * Math.PI * 2) / 16;
    const rr = i % 2 === 0 ? 17.5 : 13.5;
    const a1 = a0 - Math.PI / 16 * 0.0;
    gp.push(`${(20 + rr * Math.cos(a1 + Math.PI / 16)).toFixed(2)},${(20 + rr * Math.sin(a1 + Math.PI / 16)).toFixed(2)}`);
  }
  const gear = `M${gp.join('L')}Z`;
  return `
<linearGradient id="gStar" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#fff6b8"/><stop offset="0.38" stop-color="#ffd23a"/><stop offset="1" stop-color="#ea8e12"/></linearGradient>
<linearGradient id="gStarOff" x1="0.1" y1="0" x2="0.9" y2="1"><stop offset="0" stop-color="#6a5472"/><stop offset="1" stop-color="#2f2135"/></linearGradient>
<linearGradient id="gBrass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b0"/><stop offset="0.45" stop-color="#e0a040"/><stop offset="1" stop-color="#a06020"/></linearGradient>
<symbol id="st-on" viewBox="0 0 100 96">
  <path d="${star}" transform="translate(0 3)" fill="#4a2a0c" stroke="#4a2a0c" stroke-width="13" stroke-linejoin="round" opacity=".55"/>
  <path d="${star}" fill="#a8660e" stroke="#6a3d10" stroke-width="10" stroke-linejoin="round"/>
  <path d="${star}" fill="url(#gStar)" stroke="#ffe48a" stroke-width="3" stroke-linejoin="round" transform="translate(-0.5 -0.8) scale(1)" />
  <path d="${smallStar}" fill="rgba(255,255,255,.34)" stroke="rgba(255,255,255,.34)" stroke-width="3" stroke-linejoin="round"/>
  <ellipse cx="34" cy="29" rx="9" ry="5" transform="rotate(-38 34 29)" fill="#fff" opacity=".85"/>
</symbol>
<symbol id="st-off" viewBox="0 0 100 96">
  <path d="${star}" fill="#1b1220" stroke="#1b1220" stroke-width="11" stroke-linejoin="round"/>
  <path d="${star}" fill="url(#gStarOff)" stroke="#4d3a56" stroke-width="3" stroke-linejoin="round"/>
  <path d="${smallStar}" fill="rgba(0,0,0,.22)" stroke="rgba(0,0,0,.22)" stroke-width="3" stroke-linejoin="round" transform="translate(5 6)"/>
</symbol>
<symbol id="spk" viewBox="0 0 20 20"><path d="M10 0 L12.2 7.8 L20 10 L12.2 12.2 L10 20 L7.8 12.2 L0 10 L7.8 7.8Z" fill="#fff"/></symbol>
<symbol id="i-gear" viewBox="0 0 40 40">
  <path d="${gear}" fill="#6a3d10" stroke="#5e3512" stroke-width="5" stroke-linejoin="round"/>
  <path d="${gear}" fill="url(#gBrass)" stroke="#5e3512" stroke-width="1.5" stroke-linejoin="round"/>
  <circle cx="20" cy="20" r="6.2" fill="#2b1d2e"/><circle cx="20" cy="20" r="6.2" fill="none" stroke="#fff0b0" stroke-width="1.2"/>
</symbol>
<symbol id="i-x" viewBox="0 0 20 20"><path d="M4 4L16 16M16 4L4 16" stroke="#6a1810" stroke-width="7.5" stroke-linecap="round"/><path d="M4 4L16 16M16 4L4 16" stroke="#fff" stroke-width="4" stroke-linecap="round"/></symbol>
<symbol id="i-back" viewBox="0 0 20 20"><path d="M12.5 3.5L6 10l6.5 6.5" fill="none" stroke="#144a8a" stroke-width="7.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.5 3.5L6 10l6.5 6.5" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-check" viewBox="0 0 20 20"><path d="M3.5 10.5l4.2 4.2L16.5 5.5" fill="none" stroke="#14553a" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 10.5l4.2 4.2L16.5 5.5" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-lock" viewBox="0 0 24 28">
  <path d="M6.5 12V8.5a5.5 5.5 0 0 1 11 0V12" fill="none" stroke="#2b1d2e" stroke-width="6" stroke-linecap="round"/>
  <path d="M6.5 12V8.5a5.5 5.5 0 0 1 11 0V12" fill="none" stroke="#d8dee4" stroke-width="2.6" stroke-linecap="round"/>
  <rect x="2.5" y="11" width="19" height="14.5" rx="4" fill="#2b1d2e"/>
  <rect x="3.8" y="12.2" width="16.4" height="11.2" rx="3" fill="url(#gBrass)"/>
  <circle cx="12" cy="17" r="2.2" fill="#2b1d2e"/><rect x="11" y="17.5" width="2" height="4" rx="1" fill="#2b1d2e"/>
</symbol>
<symbol id="i-speaker" viewBox="0 0 24 24"><path d="M3 9h4l5-4v14l-5-4H3z" fill="#fff" stroke="#2b1d2e" stroke-width="2.2" stroke-linejoin="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="#2b1d2e" stroke-width="4" stroke-linecap="round"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.8a9 9 0 0 1 0 12.4" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/></symbol>
<symbol id="i-note" viewBox="0 0 24 24"><path d="M9 17.5V5.5l10-2v12" fill="none" stroke="#2b1d2e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.8" cy="17.8" rx="3.6" ry="3" fill="#2b1d2e"/><ellipse cx="16.8" cy="15.8" rx="3.6" ry="3" fill="#2b1d2e"/><path d="M9 17.5V5.5l10-2v12" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><ellipse cx="6.8" cy="17.8" rx="2.6" ry="2" fill="#fff"/><ellipse cx="16.8" cy="15.8" rx="2.6" ry="2" fill="#fff"/></symbol>
<symbol id="i-vibe" viewBox="0 0 24 24"><rect x="7.5" y="3" width="9" height="18" rx="2.6" fill="#fff" stroke="#2b1d2e" stroke-width="2.2"/><path d="M3.5 8v8M20.5 8v8M1 10.5v3M23 10.5v3" stroke="#2b1d2e" stroke-width="3.4" stroke-linecap="round"/><path d="M3.5 8v8M20.5 8v8M1 10.5v3M23 10.5v3" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/></symbol>
<symbol id="i-shake" viewBox="0 0 24 24"><path d="M3 12l3-5 3 10 3-12 3 14 3-9 3 5" fill="none" stroke="#2b1d2e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 12l3-5 3 10 3-12 3 14 3-9 3 5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#fff" stroke="#2b1d2e" stroke-width="2.4"/><ellipse cx="12" cy="12" rx="4" ry="9" fill="none" stroke="#2b1d2e" stroke-width="1.8"/><path d="M3.5 9h17M3.5 15h17" stroke="#2b1d2e" stroke-width="1.8"/></symbol>
<symbol id="i-fx" viewBox="0 0 24 24"><path d="M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z" fill="#fff" stroke="#2b1d2e" stroke-width="2.2" stroke-linejoin="round"/><circle cx="19" cy="5" r="2" fill="#fff" stroke="#2b1d2e" stroke-width="1.4"/></symbol>
<symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="#fff" stroke="#2b1d2e" stroke-width="2.4"/><circle cx="12" cy="7.4" r="1.7" fill="#2b1d2e"/><rect x="10.6" y="10.4" width="2.8" height="7.4" rx="1.4" fill="#2b1d2e"/></symbol>
<symbol id="i-skull" viewBox="0 0 24 24"><path d="M12 2.5c-5 0-8 3.4-8 7.6 0 2.6 1.2 4.3 3 5.4V19h10v-3.5c1.8-1.1 3-2.8 3-5.4 0-4.2-3-7.6-8-7.6z" fill="#fff" stroke="#2b1d2e" stroke-width="2.4" stroke-linejoin="round"/><circle cx="8.6" cy="11" r="2.3" fill="#2b1d2e"/><circle cx="15.4" cy="11" r="2.3" fill="#2b1d2e"/><path d="M10.5 15.5l1.5-2 1.5 2z" fill="#2b1d2e"/></symbol>
<symbol id="i-flame" viewBox="0 0 24 24"><path d="M12.5 2c.6 4-3.5 5.2-3.5 9.2 0 1.7.9 2.8 2 3.4-.2-1.8 1-3 1.9-3.8.4 1.4 2.6 2.4 2.6 4.6A5.4 5.4 0 0 1 9.6 21C6 21 4 18.4 4 15.2 4 9 11 7.8 12.5 2z" fill="#ff9a1a" stroke="#6a1810" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 21c-2 0-3.4-1.4-3.4-3.2 0-1.8 1.8-2.6 2.6-4.2 1.3 1 3.6 2.2 3.6 4.4 0 1.8-1.2 3-2.8 3z" fill="#ffe36a"/></symbol>
<symbol id="i-chev" viewBox="0 0 20 20"><path d="M7 3.5L13.5 10 7 16.5" fill="none" stroke="#2b1d2e" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 3.5L13.5 10 7 16.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-up" viewBox="0 0 20 20"><path d="M10 17V4M4 9.5L10 3.5l6 6" fill="none" stroke="#14553a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 17V4M4 9.5L10 3.5l6 6" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></symbol>
<symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12.5" r="9" fill="#fff" stroke="#2b1d2e" stroke-width="2.4"/><path d="M12 7v5.6l3.6 2" fill="none" stroke="#2b1d2e" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><rect x="9.5" y="1.4" width="5" height="2.6" rx="1" fill="#2b1d2e"/></symbol>
`;
}
