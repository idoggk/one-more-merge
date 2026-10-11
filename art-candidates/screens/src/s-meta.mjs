import { art, btn, pill, pips, rib, bar, star, spark, motes, statusBar, nav, machine, iconBack, iconGear, panelRivets, rng, px } from './lib.mjs';
import { topbar } from './s-home.mjs';

/* ============================================================================================
   ROAD (level map). Sub-page opened from the home chapter strip. Sticky play card at the bottom.
   ============================================================================================ */
const NODES = [
  { n: 16, x: 298, y: 118, kind: 'locked' },
  { n: 15, x: 298, y: 212, kind: 'locked' },
  { n: 14, x: 195, y: 300, kind: 'locked', tag: 'HARD', hard: true },
  { n: 13, x: 92, y: 392, kind: 'locked' },
  { n: 12, x: 195, y: 486, kind: 'current' },
  { n: 11, x: 298, y: 580, kind: 'done', stars: 3 },
  { n: 10, x: 195, y: 676, kind: 'done', stars: 2, boss: true },
];

function roadScreen() {
  // road path through the node centres (bottom -> top)
  const pts = [...NODES].reverse();
  let d = `M${pts[0].x} ${pts[0].y + 70}`;
  let dDone = d;
  let dLocked = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const prev = i === 0 ? { x: p.x, y: p.y + 70 } : pts[i - 1];
    const mx = (prev.x + p.x) / 2 + (i % 2 ? 26 : -26);
    const my = (prev.y + p.y) / 2;
    const seg = `Q${mx} ${my} ${p.x} ${p.y}`;
    d += seg;
    if (p.kind === 'done' || p.kind === 'current') dDone += seg;
    else dLocked += `${dLocked ? '' : `M${prev.x} ${prev.y}`}${seg}`;
  }
  const road = `<svg class="rd-svg" viewBox="0 0 390 844">
    <path d="${d}" fill="none" stroke="#2b1d2e" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" opacity=".92"/>
    <path d="${d}" fill="none" stroke="#f6e6c6" stroke-width="31" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#e5cfa2" stroke-width="31" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 17" opacity=".7"/>
    <path d="${dDone}" fill="none" stroke="#e0a040" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${dDone}" fill="none" stroke="#ffd45a" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${dDone}" fill="none" stroke="#fff3b0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" transform="translate(-1.5 -1.5)" opacity=".7"/>
    <path d="${dLocked}" fill="none" stroke="#b49a7a" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="2 9" opacity=".9"/>
  </svg>`;

  const nodeHtml = NODES.map((o) => {
    const key = o.kind === 'done' ? (o.boss ? 'node_completed' : 'node_completed') : o.kind === 'locked' ? (o.hard ? 'node_locked' : 'node_locked') : o.hard ? 'node_hard' : 'node_normal';
    const w = o.boss ? 78 : o.kind === 'current' ? 76 : o.kind === 'done' ? 64 : 62;
    const nat = { node_completed: [166, 200], node_locked: [199, 200], node_normal: [200, 164], node_hard: [200, 187] }[key];
    const h = (w * nat[1]) / nat[0];
    const num = `<b class="nn ${o.kind}" style="top:${o.kind === 'done' ? '37%' : o.kind === 'current' ? '44%' : '46%'};font-size:${o.kind === 'current' ? 34 : 26}px">${o.kind === 'locked' ? '' : o.n}</b>`;
    const sts = o.kind === 'done' ? `<span class="nstars">${[0, 1, 2].map((i) => star(i < o.stars, 15)).join('')}</span>` : '';
    const lockn = o.kind === 'locked' ? `<b class="nn lk" style="top:34%;font-size:22px">${o.n}</b>` : '';
    const ring = o.kind === 'current' ? '<i class="nring"></i><i class="nring r2"></i>' : '';
    const extra =
      o.kind === 'current'
        ? `<div class="avatar">${art('cannon_2', 58, 58)}<i class="gshadow" style="left:6px;bottom:-4px;width:46px;height:12px"></i></div><div class="you"><span>YOU</span><svg viewBox="0 0 20 20" width="18" height="18"><path d="M3 5l7 9 7-9z" fill="#ffd45a" stroke="#7a4a10" stroke-width="2.4" stroke-linejoin="round"/></svg></div>`
        : o.tag
          ? `<span class="ntag ${o.hard ? 'hard' : ''}">${o.tag}</span>`
          : '';
    return `<div class="node ${o.kind}" style="left:${o.x}px;top:${o.y}px">${ring}<div class="nbody" style="width:${w}px;height:${h.toFixed(1)}px">${art(key, w, h, 'shad-l')}${num}${lockn}${sts}</div>${extra}</div>`;
  }).join('');

  // bubbles drifting up (laundry chapter ambience)
  const r = rng(91);
  const bubbles = Array.from({ length: 12 }, () => {
    const s = 10 + r() * 26;
    return `<i style="left:${px(r() * 390)};top:${px(300 + r() * 540)};width:${px(s)};height:${px(s)};--t:${(9 + r() * 8).toFixed(1)}s;--d:${(-r() * 14).toFixed(1)}s;--dx:${px((r() - 0.5) * 40)}"></i>`;
  }).join('');

  const html = `<div class="road">
    <div class="layer rd-bg a-road_bg"></div>
    <div class="layer rd-tint"></div>
    <div class="grain"></div>
    <div class="bubbles">${bubbles}</div>
    ${road}
    <div class="rd-nodes">${nodeHtml}</div>
    <div class="layer rd-fade"></div>
    <div class="vig" style="opacity:.55"></div>
    ${statusBar(false)}
    <div class="rd-top">
      <button class="rbtn r-blue" aria-label="Back">${iconBack(22)}</button>
      ${rib('CH 2 · LAUNDRY', 'blue', 'sm nw', '--f1:#5fc8bd;--f2:#2f9a90;--lip:#237a72;--o:#14504a')}
      ${pill('icon_bolt', '1,240', false)}
    </div>
    <div class="rd-chap"><div class="rc-t">${art('medal', 30, 30)}<b>CHAPTER MEDAL</b><span>3 / 10</span></div>${bar(30, 'y', { h: 14, cls: 'rc-bar', ticks: [] })}</div>
    <div class="rd-play">
      <div class="panel">${panelRivets}
        <div class="rp-in">
          <div class="well rp-mon">${art('mon_sock_cyclops', 60, 60)}</div>
          <div class="rp-txt"><b class="dk">LEVEL 12</b><span class="dk2">2 machines · Goal: rank 4</span><span class="rp-st">${star(false, 17)}${star(false, 17)}${star(false, 17)}</span></div>
          ${btn('PLAY', 'prime', 'lg', 'sweep')}
        </div>
      </div>
    </div>
  </div>`;
  return { id: 'road', group: 'tabs', title: 'Level road', note: 'Opens from the chapter strip. Done nodes carry earned stars, the current node pulses with a YOU marker, locked nodes are padlocked. Sticky play card at the bottom.', html };
}

/* ============================================================================================
   UNITS tab
   ============================================================================================ */
const UNITS = [
  { name: 'CANNON', art: 'cannon_4', q: 'common', role: 'role_shooter', lv: 4, pips: 5, have: 7, need: 10, fam: '#e8452c', up: true },
  { name: 'COIL', art: 'coil_3', q: 'common', role: 'role_relay', lv: 3, pips: 3, have: 3, need: 6, fam: '#27c4e0' },
  { name: 'BELL', art: 'bell_6', q: 'common', role: 'role_relay', lv: 6, pips: 6, have: 10, need: 10, fam: '#f2b521', max: true },
  { name: 'ROCKET', art: 'rocket_3', q: 'rare', role: 'role_shooter', lv: 1, pips: 2, have: 1, need: 3, fam: '#ff8a3c', isNew: true },
  { name: 'BATTERY', art: 'battery_3', q: 'rare', role: 'role_support', lv: 2, pips: 3, have: 4, need: 4, fam: '#7ccf2e', up: true },
  { name: 'MAGNET', art: 'magnet_3', q: 'rare', role: 'role_mover', lv: 2, pips: 3, have: 2, need: 4, fam: '#c23fd1' },
  { name: 'ARC WELDER', art: 'arc_welder_4', q: 'epic', role: 'role_shooter', lv: 1, pips: 2, have: 1, need: 2, fam: '#3a6aff' },
  { name: 'SAW BLADE', art: 'saw_blade_3', q: 'epic', role: 'role_shooter', lv: 1, pips: 1, have: 2, need: 2, fam: '#c8d0d8' },
  { name: 'TESLA TOWER', art: 'unit_tesla_tower', q: 'legend', role: 'role_shooter', lv: 1, pips: 1, have: 1, need: 2, fam: '#6ad0ff' },
  { name: 'HORN', art: 'horn_3', q: 'common', role: 'role_relay', locked: true, fam: '#d09030' },
  { name: 'GEAR', art: 'gear_3', q: 'rare', role: 'role_relay', locked: true, fam: '#9a7a5a' },
  { name: 'CRANE', art: 'unit_crane', q: 'epic', role: 'role_relay', locked: true, fam: '#e0a020' },
];

function unitCard(u) {
  const q = u.q === 'legend' ? 'legend' : u.q;
  const body = u.locked
    ? `<div class="uc-art locked">${art(u.art, 78, 78)}<svg class="uc-lock" viewBox="0 0 24 28"><use href="#i-lock"/></svg></div>
       <div class="uc-name">${u.name}</div><div class="uc-sub">1 of 3 parts</div>
       <div class="uc-bar">${bar(33, 'b', { h: 11 })}</div>`
    : `<div class="uc-art" style="--fam:${u.fam}"><i class="uc-glow"></i>${art(u.art, 80, 80)}<i class="gshadow" style="left:14px;bottom:2px;width:60px;height:12px"></i></div>
       <div class="uc-name">${u.name}</div>
       <div class="uc-pips">${pips(u.pips, 6, u.max ? 'max' : '')}</div>
       <div class="uc-bar">${bar(Math.round((u.have / u.need) * 100), u.up ? 'g' : 'b', { h: 12 })}<span>${u.have}/${u.need}</span></div>`;
  return `<div class="ucard q-${q} ${u.locked ? 'is-locked' : ''} ${u.q === 'legend' ? 'legend' : ''}">
    <i class="uc-face"></i>
    ${body}
    <i class="uc-frame"></i>
    ${u.locked ? '' : `<span class="uc-lv">Lv ${u.lv}</span>${art(u.role, 22, 22, 'uc-role')}`}
    ${u.up ? '<span class="uc-up"><svg viewBox="0 0 20 20" width="14" height="14"><use href="#i-up"/></svg></span>' : ''}
    ${u.isNew ? '<span class="new" style="left:-9px;top:-7px;transform:rotate(-8deg);z-index:9">NEW</span>' : ''}
    ${u.q === 'legend' && !u.locked ? `<i class="uc-glint"></i>${spark(86, 14, 12, 0.3)}${spark(8, 82, 10, 1.1)}` : ''}
  </div>`;
}

function unitsScreen() {
  const html = `<div class="tabscr t-units">
    <div class="layer tab-bg"></div><div class="grain"></div>
    ${statusBar(false)}
    ${topbar()}
    <div class="tab-head">
      ${rib('MY UNITS', 'blue', '')}
    </div>
    <div class="col-bar well">
      <div class="cb-l"><b class="dk">COLLECTION</b><span class="dk2">9 of 39 owned</span></div>
      <div class="cb-bar">${bar(23, 'b', { h: 16 })}</div>
      ${art('crate_bag', 40, 40, 'cb-ic')}
      <i class="dot" style="right:6px;top:-5px"></i>
    </div>
    <div class="seg r-blue filt"><i style="left:3px;width:calc(25% - 3px)"></i><span class="on">ALL</span><span>SHOOT</span><span>RELAY</span><span>HELP</span></div>
    <div class="ugrid">${UNITS.map(unitCard).join('')}</div>
    <div class="layer tab-fade"></div>
    ${nav('units')}
  </div>`;
  return { id: 'units', group: 'tabs', title: 'Units tab', note: 'Rarity-framed cards (common steel, rare blue, epic purple, legendary gold with glint), rank pips, copies bar, NEW tag, upgrade arrow, locked silhouettes, role badges.', html };
}

/* ============================================================================================
   MACHINE tab
   ============================================================================================ */
const FINISHES = [
  { id: 'brass_kit', name: 'BRASS', sel: false },
  { id: 'cherry_paint', name: 'CHERRY', sel: false },
  { id: 'master_finish', name: 'MASTER', sel: true },
  { id: 'cobalt_paint', name: 'COBALT', sel: false },
  { id: 'mint_paint', name: 'MINT', price: 120 },
  { id: 'night_paint', name: 'NIGHT', price: 200 },
];

async function machineScreen() {
  const mach = await machine({ width: 312, finish: 'master_finish', ranks: { cannon: 6, coil: 4, bell: 4 }, helper: 'magnet', helperRank: 3 });
  const fin = FINISHES.map((f) => `<div class="fin ${f.sel ? 'sel' : ''}">
      <div class="fin-img">${art(`hero_chassis_${f.id}`, 70, 40)}${f.price ? '<svg class="fin-lock" viewBox="0 0 24 28"><use href="#i-lock"/></svg>' : ''}${f.sel ? `<span class="fin-ck"><svg viewBox="0 0 20 20" width="14" height="14"><use href="#i-check"/></svg></span>` : ''}</div>
      <b>${f.name}</b>${f.price ? `<span class="fin-pr">${art('icon_gem', 16, 16)}${f.price}</span>` : ''}
    </div>`).join('');
  const mounts = [
    { t: 'SHOOTER', a: ['cannon_4', 'rocket_3', 'mortar_3', 'arc_welder_4'], sel: 0 },
    { t: 'HELPER', a: ['magnet_3', 'fan_3', 'battery_3', 'amplifier_3'], sel: 0 },
  ];
  const mt = mounts.map((m) => `<div class="mnt"><b class="mnt-t">${m.t}</b><div class="mnt-row">${m.a.map((a, i) => `<div class="mt ${i === m.sel ? 'sel' : ''}">${art(a, 44, 44)}</div>`).join('')}</div></div>`).join('');
  const html = `<div class="tabscr t-machine">
    <div class="layer tab-bg"></div><div class="grain"></div>
    ${statusBar(false)}
    ${topbar()}
    <div class="show">
      <div class="show-bg a-hero_bg"></div><div class="show-vig"></div>
      <div class="shaft" style="left:-30px;top:-20px;width:140px;height:260px"></div>
      ${motes(14, 5, 360, 230, { top: 0.3 })}
      <i class="halo" style="left:50%;top:40px;width:300px;height:180px;margin-left:-150px;--hc:255,226,140"></i>
      <div class="show-m">${mach}</div>
      <div class="show-name"><b>THE JUNKER</b><small>MASTER FINISH · POWER 12.4K</small></div>
      ${spark(40, 60, 14, 0.3)}${spark(318, 50, 12, 1.1)}${spark(300, 150, 13, 0.7)}
      <div class="show-rank">${art('crown', 28, 28)}<span>TIER 3</span></div>
    </div>
    <div class="mrow fin-r">
      <div class="msec-t">${rib('FINISH', 'blue', 'sm')}</div>
      <div class="fins">${fin}</div>
    </div>
    <div class="mrow mounts">${mt}</div>
    <div class="m-play">${btn('PLAY LEVEL 12', 'prime', 'lg', 'sweep')}</div>
    ${nav('machine')}
  </div>`;
  return { id: 'machine', group: 'tabs', title: 'Machine tab', note: 'Hero machine showcase on the workshop pedestal (real layered art), finish picker with locks and gem prices, shooter and helper mounts, Play.', html };
}

/* ============================================================================================
   CRATES tab: the four tiers
   ============================================================================================ */
const CRATE_TIERS = [
  { key: 'bag', name: 'TOOL BAG', q: 'common', art: 'crate_bag', info: '3 parts', odds: 'Common+', own: 3, btn: ['OPEN', 'go'] },
  { key: 'toolbox', name: 'TOOLBOX', q: 'rare', art: 'crate_toolbox', info: '8 parts', odds: 'Rare+ sure', own: 1, btn: ['OPEN', 'go'] },
  { key: 'chest', name: 'TOOL CHEST', q: 'epic', art: 'crate_chest', info: '20 parts', odds: 'Epic+ sure', timer: '5:40:12', btn: ['SKIP', 'blue', 'icon_gem', 45] },
  { key: 'bench', name: 'GOLDEN WORKBENCH', q: 'legend', art: 'crate_workbench', info: '10 parts', odds: 'Legend sure', btn: ['BUY', 'purple', 'icon_gem', 300] },
];

function crateCard(c) {
  const chip = c.own ? `<span class="cc-own">x${c.own}</span>` : c.timer ? `<span class="cc-tm"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg>${c.timer}</span>` : '';
  const price = c.btn[2] ? `${art(c.btn[2], 20, 20)}${c.btn[3]}` : '';
  return `<div class="ccard q-${c.q} ${c.q === 'legend' ? 'legend' : ''}">
    <div class="cc-head"><b>${c.name}</b></div>
    <div class="cc-stage"><i class="halo" style="--hc:var(--qg);left:50%;top:50%;width:150px;height:150px;margin:-75px 0 0 -75px"></i><i class="gshadow" style="left:22px;bottom:2px;width:106px;height:20px"></i>${art(c.art, 132, 132, 'cc-art')}${chip}${c.q === 'legend' ? `${spark(16, 16, 14, 0.2)}${spark(128, 30, 12, 0.9)}${spark(112, 98, 14, 1.4)}` : ''}</div>
    <div class="cc-info"><span>${c.info}</span><i></i><span>${c.odds}</span></div>
    ${btn(`${c.btn[0]}${price ? ` <u class="cc-pr">${price}</u>` : ''}`, c.btn[1], 'sm', 'block')}
  </div>`;
}

function cratesScreen() {
  const html = `<div class="tabscr t-crates">
    <div class="layer tab-bg"></div><div class="grain"></div>
    ${statusBar(false)}
    ${topbar()}
    <div class="tab-head">${rib('CRATES', 'blue', '')}</div>
    <div class="cgrid">${CRATE_TIERS.map(crateCard).join('')}</div>
    <div class="cfoot well">
      <div class="cf-l"><b class="dk">FREE TOOL BAG IN</b><span class="cf-t">02:14:08</span></div>
      <div class="cf-bar">${bar(64, 'g', { h: 16 })}</div>
    </div>
    <div class="cpity well"><span class="dk2">Epic part guaranteed in</span><b class="dk">4 crates</b>${pips(2, 6)}</div>
    ${nav('crates')}
  </div>`;
  return { id: 'crates', group: 'tabs', title: 'Crates', note: 'The four tiers (Tool Bag, Toolbox, Tool Chest, Golden Workbench) as rarity-coloured cards with real crate art, owned count or timer, odds line and one clear action each. Free-crate timer and pity bar below.', html };
}

export async function metaScreens() {
  return [roadScreen(), unitsScreen(), await machineScreen(), cratesScreen()];
}
