import { art, btn, pill, pips, rib, star, spark, motes, statusBar, nav, machine, iconGear, panelRivets } from './lib.mjs';

/** top bar shared by home and the tab screens */
export function topbar(opts = {}) {
  return `<div class="topbar">
    <div class="lvlb" style="--xp:${opts.xp ?? 62}%"><b>7</b></div>
    <div class="cur">${pill('icon_bolt', opts.bolts ?? '1,240', true)}${pill('icon_gem', '86', true)}</div>
    <button class="rbtn gear r-cream" aria-label="Settings">${iconGear(25)}</button>
  </div>`;
}

const chapterStrip = () => `<a class="chapter" href="?screen=road">
    <b>CH 2 · LAUNDRY</b>
    <span class="pips">${Array.from({ length: 10 }, (_, i) => `<i class="${i < 3 ? '' : 'e'}"></i>`).join('')}</span>
    ${art('medal', 30, 30)}
  </a>`;

const playButton = (level = 12) => `<div class="playwrap">
    <i class="halo"></i>
    ${btn('PLAY', 'prime', 'xl', 'sweep breathe')}
    <div class="lvbadge"><small>LEVEL</small><b>${level}</b></div>
  </div>`;

const crateRow = () => `<div class="crates">
    <div class="cslot ready q-common">${art('crate_bag', 66, 66, 'cr')}<div class="tm">OPEN</div></div>
    <div class="cslot q-rare">${art('crate_toolbox', 66, 66, 'cr')}<div class="tm"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg>2:14:08</div></div>
    <div class="cslot q-epic">${art('crate_chest', 66, 66, 'cr')}<div class="tm"><svg viewBox="0 0 24 24"><use href="#i-clock"/></svg>5:40:12</div></div>
    <div class="cslot lock q-legend">${art('crate_workbench', 66, 66, 'cr')}<svg class="pl" viewBox="0 0 24 28"><use href="#i-lock"/></svg><div class="tm">LEVEL 15</div></div>
  </div>`;

const dailyStrip = () => `<div class="daily">
    ${art('booster_jumpstart', 36, 36)}
    <div class="dt"><b>DAILY BOUNTY</b>${pips(2, 3)}</div>
    ${btn('CLAIM', 'go', 'sm')}
    <i class="dot"></i>
  </div>`;

/** A1 board data: [row, col, art, idle-delay] */
const BOARD = [
  [0, 0, 'coil_2'], [0, 2, 'cannon_3'], [0, 4, 'bell_2'],
  [1, 1, 'bell_3'], [1, 3, 'magnet_2'],
  [2, 0, 'cannon_2'], [2, 2, 'coil_3'], [2, 4, 'battery_2'],
  [3, 1, 'fan_2'], [3, 3, 'cannon_4'],
  [4, 0, 'bell_1'], [4, 2, 'cannon_2', 'hot'], [4, 3, 'cannon_2'], [4, 4, 'coil_1'],
  [5, 1, 'rocket_2'], [5, 4, 'horn_2'],
];
const PITCH = 47;
const cx = (c) => 22 + c * PITCH;
const cy = (r) => 22 + r * PITCH;

function boardHtml() {
  const cells = [];
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 5; c++) {
      const u = BOARD.find((b) => b[0] === r && b[1] === c);
      const idx = r * 5 + c;
      cells.push(
        `<div class="bc ${u?.[3] === 'hot' ? 'hot' : ''}">${art('slot', 46, 46, 'slot')}${u ? `<div class="u">${art(u[2], 58, 58, '', `--d:${(-((idx * 0.37) % 2.6)).toFixed(2)}s`)}</div>` : ''}</div>`,
      );
    }
  }
  // lightning-ish links on the plane: coil (r2,c2) -> cannon (r0,c2), bell (r1,c1) -> magnet (r1,c3)
  const zig = (x0, y0, x1, y1, n = 6, amp = 5) => {
    const pts = [`${x0},${y0}`];
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const side = i % 2 ? 1 : -1;
      pts.push(`${(x0 + (x1 - x0) * t + (y1 !== y0 ? side * amp : 0)).toFixed(1)},${(y0 + (y1 - y0) * t + (x1 !== x0 ? side * amp : 0)).toFixed(1)}`);
    }
    pts.push(`${x1},${y1}`);
    return pts.join(' ');
  };
  const links = `<div class="blinks"><svg viewBox="0 0 235 282">
    <polyline class="lk" style="color:#27c4e0" stroke="#27c4e0" points="${zig(cx(2), cy(2) - 4, cx(2), cy(0) + 10)}"/>
    <polyline class="lk" style="color:#f2b521;animation-duration:1s" stroke="#f2b521" points="${cx(1) + 10},${cy(1) - 6} ${cx(3) - 10},${cy(1) - 6}"/>
    <polyline class="lk" style="color:#7ccf2e;animation-duration:.9s" stroke="#7ccf2e" points="${zig(cx(4), cy(2) + 4, cx(3) + 4, cy(3) - 6, 4, 4)}"/>
  </svg></div>`;
  return `<div class="b3d"><div class="bplane">
      <div class="btray">${panelRivets}<div class="bgrid">${cells.join('')}</div>${links}</div>
    </div></div>`;
}

export async function homeScreens() {
  const a1 = `<div class="home">
    <div class="layer bd-hero a-hero_bg" style="background-position:50% -168px"></div>
    <div class="layer" style="background:radial-gradient(60% 40% at 50% 38%, rgba(255,214,140,.35), rgba(255,214,140,0) 70%)"></div>
    <div class="shaft" style="left:-70px;top:-10px;width:250px;height:520px"></div>
    <div class="shaft" style="left:100px;top:-10px;width:120px;height:430px;animation-delay:-3s;opacity:.7"></div>
    ${motes(24, 11, 390, 520, { top: 0.25 })}
    <div class="vig"></div>
    ${statusBar()}
    ${topbar()}
    ${chapterStrip()}
    <div class="hero">
      <div class="gshadow h-shad"></div>
      ${boardHtml()}
      <div class="plaque l">${art('crown', 34, 34, 'pq-ic')}<small>BEST RANK</small><b>6</b></div>
      <div class="plaque r"><span class="pq-x">x12</span><small>BEST CHAIN</small></div>
      ${spark(48, 100, 16, 0.2)}${spark(330, 70, 13, 0.9)}${spark(310, 210, 15, 1.4)}${spark(40, 200, 12, 0.5)}
    </div>
    ${playButton()}
    ${crateRow()}
    ${dailyStrip()}
    ${nav('home')}
  </div>`;

  const mach = await machine({ width: 372, finish: 'master_finish', ranks: { cannon: 6, coil: 4, bell: 4 }, helper: 'magnet', helperRank: 3 });
  const a2 = `<div class="home">
    <div class="layer bd-hero a-hero_bg" style="background-position:50% -128px"></div>
    <div class="shaft" style="left:-60px;top:-10px;width:260px;height:560px"></div>
    <div class="shaft" style="left:120px;top:-10px;width:130px;height:460px;animation-delay:-3s;opacity:.7"></div>
    ${motes(26, 23, 390, 520, { top: 0.2 })}
    <div class="vig"></div>
    ${statusBar()}
    ${topbar()}
    ${chapterStrip()}
    <div class="hero">
      <i class="halo a2-glow"></i>
      <div class="a2-name">${art('crown', 30, 30)}<b>YOUR MACHINE</b><span>MASTER</span></div>
      <div class="a2-ring"></div>
      <div class="a2-machine">${mach}</div>
      ${spark(62, 96, 16, 0.2)}${spark(318, 80, 13, 0.9)}${spark(300, 170, 15, 1.4)}${spark(70, 150, 12, 0.5)}
      <div class="squad">
        <div class="sq q-rare">${art('cannon_4', 54)}${pips(4, 6)}</div>
        <div class="sq q-epic">${art('coil_3', 54)}${pips(3, 6)}</div>
        <div class="sq q-common">${art('bell_3', 54)}${pips(3, 6)}</div>
        <div class="sq q-rare">${art('magnet_2', 54)}${pips(2, 6)}</div>
        <div class="sq add">+</div>
      </div>
    </div>
    ${playButton()}
    ${crateRow()}
    ${dailyStrip()}
    ${nav('home')}
  </div>`;

  return [
    { id: 'home-a1', group: 'home', title: 'Home A1: board showcase', note: 'Your live board, tilted on a workbench, mid-chain. Huge Play with level badge, crate row with timers, daily strip, 5-tab nav.', html: a1 },
    { id: 'home-a2', group: 'home', title: 'Home A2: hero machine on a pedestal', note: 'Your assembled machine on the workshop pedestal, squad row (deck preview) beneath it. Same Play, crates, daily, nav.', html: a2 },
  ];
}
