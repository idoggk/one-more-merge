import { art, btn, pill, pips, rib, bar, star, statusBar, panelRivets, iconClose, iconBack, iconGear } from './lib.mjs';

/* ============================================================================================
   SETTINGS
   ============================================================================================ */
const row = (icon, role, label, control) => `<div class="sr well"><i class="sr-ic r-${role}"><svg viewBox="0 0 24 24"><use href="#i-${icon}"/></svg></i><b class="dk">${label}</b>${control}</div>`;

function settingsScreen() {
  const html = `<div class="settings">
    <div class="st-bg a-hero_bg"></div><div class="dim" style="background:rgba(27,18,32,.62)"></div>
    ${statusBar()}
    <div class="st-panel panel">${panelRivets}
      <div class="st-rib">${rib('SETTINGS', 'blue', '')}</div>
      <button class="rbtn r-red st-x" aria-label="Close">${iconClose(18)}</button>
      <div class="st-body">
        <div class="st-sec">${rib('SOUND', 'go', 'sm')}</div>
        ${row('speaker', 'blue', 'Sound effects', '<i class="tog on"></i>')}
        ${row('note', 'purple', 'Music', '<i class="tog on"></i>')}
        ${row('speaker', 'go', 'Volume', '<div class="sld" style="--p:68%"><i></i><u></u></div>')}
        <div class="st-sec">${rib('GAME', 'prime', 'sm')}</div>
        ${row('vibe', 'go', 'Vibration', '<i class="tog on"></i>')}
        ${row('shake', 'red', 'Screen shake', '<div class="seg r-blue sg"><i style="left:calc(66.6% + 1px);width:calc(33.4% - 4px)"></i><span>OFF</span><span>SOFT</span><span class="on">FULL</span></div>')}
        ${row('fx', 'purple', 'Reduce effects', '<i class="tog"></i>')}
        ${row('globe', 'blue', 'Language', btn('ENGLISH', 'blue', 'sm'))}
        <div class="st-sec">${rib('HELP', 'blue', 'sm')}</div>
        ${row('info', 'blue', 'How to play', btn('OPEN', 'blue', 'sm'))}
        ${row('info', 'grey', 'Restore progress', btn('RESTORE', 'grey', 'sm'))}
      </div>
      <div class="st-foot"><small class="dk2">Version 0.9.3 · build 2026-10-11</small>${btn('RESET PROGRESS', 'red', 'sm')}</div>
    </div>
  </div>`;
  return { id: 'settings', group: 'system', title: 'Settings', note: 'Ribbon section headers, toggles with check, slider with value knob, segmented off/soft/full, icon tiles in role colours, nothing under 12 px, every row 46 px tall.', html };
}

/* ============================================================================================
   UI KIT SPECIMEN (3 sheets: buttons, bars and controls, panels and type)
   ============================================================================================ */
const cap = (t) => `<small class="k-cap">${t}</small>`;
const kitHead = (t) => `<div class="tab-bg-k"></div><div class="grain"></div>${statusBar()}<div class="k-title">${rib(t, 'blue', 'sm nw')}</div>`;

function kit1() {
  const html = `<div class="kit">
    ${kitHead('KIT 1 · BUTTONS')}
    <div class="k-sec k-roles">
      ${btn('PLAY', 'prime', '', 'sweep')}${btn('GO', 'go')}${btn('INFO', 'blue')}${btn('DANGER', 'red')}${btn('PREMIUM', 'purple')}${btn('LOCKED', 'grey', '', 'off')}
    </div>
    <div class="k-sec k-note k-n1">${cap('Colour is meaning: yellow play and claim, green go and buy, blue info, red danger and close, purple premium, grey disabled.')}</div>
    <div class="k-sec k-sizes">
      ${btn('PLAY', 'prime', 'xl', 'sweep')}
      <div class="k-row">${btn('NEXT LEVEL', 'prime', 'lg')}${btn('HOME', 'blue', 'sm')}</div>
      ${cap('sizes: xl 80 · lg 58 · md 46 · sm 38 px')}
    </div>
    <div class="k-sec k-states">
      <div class="k-cell">${btn('PRESSED', 'go', '', 'pressed')}${cap('press: 0.965, face drops, lip gone')}</div>
      <div class="k-cell">${btn('BUY', 'grey', '', 'off')}<small class="k-why">Needs 3 more bolts</small></div>
    </div>
    <div class="k-sec k-icons">
      <button class="rbtn r-red">${iconClose(18)}</button>
      <button class="rbtn r-blue">${iconBack(20)}</button>
      <button class="rbtn r-cream">${iconGear(24)}</button>
      <button class="rbtn r-go"><svg width="22" height="22" viewBox="0 0 20 20"><use href="#i-check"/></svg></button>
      ${art('icon_pause', 44, 44, 'k-pause')}
    </div>
    <div class="k-sec k-note k-n2">${cap('Round icon buttons. Close is always red and top-right.')}</div>
    <div class="k-sec k-seg">
      <div class="seg r-blue" style="width:196px"><i style="left:3px;width:calc(33.3% - 3px)"></i><span class="on">ROAD</span><span>DAILY</span><span>YARD</span></div>
      <i class="tog on"></i><i class="tog"></i>
      <div class="sld" style="--p:55%;width:92px"><i></i><u></u></div>
    </div>
  </div>`;
  return { id: 'kit-1', group: 'system', title: 'UI kit 1: buttons', note: 'Roles (colour never changes meaning), four sizes, the press state and a disabled button that says why, round icon buttons, segmented control, toggles, slider.', html };
}

function kit2() {
  const html = `<div class="kit">
    ${kitHead('KIT 2 · BARS AND CHIPS')}
    <div class="k-sec k-pills">${pill('icon_bolt', '1,240', true)}${pill('icon_gem', '86', true)}${pill('icon_scrap', '14', false)}</div>
    <div class="k-sec k-bars">
      <div class="k-bar">${bar(86, 'g', { h: 24 })}${cap('HP: rounded caps, gloss, shine sweep every 2.8 s')}</div>
      <div class="k-bar">${bar(46, 'y', { h: 24, lag: 62 })}${cap('lag trail: the pale bar catches up 400 ms later')}</div>
      <div class="k-bar">${bar(16, 'r', { h: 24, lag: 22, cls: 'pulse' })}${cap('under 30% red, under 20% it pulses')}</div>
      <div class="k-bar">${bar(58, 'b', { h: 22, ticks: [33, 66] })}${cap('milestone ticks with stars')}<span class="k-ms m1">${star(true, 20)}</span><span class="k-ms m2">${star(false, 20)}</span></div>
    </div>
    <div class="k-sec k-stars">${star(false, 38)}${star(true, 38)}${star(true, 46)}${star(true, 38)}</div>
    <div class="k-sec k-rar"><span class="chip r-grey">COMMON</span><span class="chip r-blue">RARE</span><span class="chip r-purple">EPIC</span><span class="chip r-prime">LEGEND</span></div>
    <div class="k-sec k-badges">
      <span class="new" style="position:relative;left:0;top:0">NEW</span>
      <span class="k-b" style="position:relative;width:20px;height:20px"><i class="dot" style="left:3px;top:3px"></i></span>
      <span class="k-b" style="position:relative;width:30px;height:22px"><b class="cnt" style="left:4px;top:1px">3</b></span>
      <span class="k-b">${pips(2, 6)}</span><span class="k-b">${pips(6, 6, 'max')}</span>
      <span class="k-b"><svg width="20" height="24" viewBox="0 0 24 28"><use href="#i-lock"/></svg></span>
      <span class="k-b">${art('crown', 30, 30)}</span>
    </div>
    <div class="k-sec k-ladder">
      <span class="lad l1">x3</span><span class="lad l2">x6</span><span class="lad l3">x9</span><span class="lad l4">x12</span>
    </div>
    <div class="k-sec k-note k-n3">${cap('Chain counter ladder: white x1-4, yellow x5-7, orange x8-11, red x12+')}</div>
    <div class="k-sec k-dmg">
      <span class="dn n1">1,284</span><span class="dn n2">2,960</span><span class="dn n3">6,420!</span><span class="dn n4">+12</span>
    </div>
    <div class="k-sec k-note k-n4">${cap('Damage numbers: normal, chain hit, crit, heal and charge')}</div>
  </div>`;
  return { id: 'kit-2', group: 'system', title: 'UI kit 2: bars, chips, numbers', note: 'Currency pills, HP bar variants (full, lag trail, low-HP pulse, milestone ticks), stars, rarity chips, badges, the chain counter colour ladder and damage-number colours from the Art Bible.', html };
}

function kit3() {
  const html = `<div class="kit">
    ${kitHead('KIT 3 · PANELS AND TABS')}
    <div class="k-panel panel">${panelRivets}
      <div class="kp-rib">${rib('PANEL', 'go', 'sm')}</div>
      <div class="kp-in"><b class="dk">Plum edge, brass trim, cream bezel, inset well, corner rivets.</b>
        <div class="well kp-well"><span class="dk2">inset well</span>${pips(3, 6)}</div></div>
    </div>
    <div class="k-sec k-ribs">${rib('VICTORY', 'prime', 'sm')}${rib('SHOP', 'go', 'sm')}${rib('WARNING', 'red', 'sm')}${rib('EPIC', 'purple', 'sm')}</div>
    <div class="k-sec k-row96">
      <div class="lrow"><div class="well lr-i">${art('cannon_3', 44, 44)}</div><div class="lr-t"><b class="dk">Cannon</b><span class="dk2">Shooter · Lv 4</span></div>${btn('UPGRADE', 'go', 'sm')}</div>
      <div class="lrow"><div class="well lr-i">${art('coil_3', 44, 44)}</div><div class="lr-t"><b class="dk">Coil</b><span class="dk2">Relay · Lv 3</span></div><i class="tog on"></i></div>
    </div>
    <div class="k-sec k-tabs">
      <div class="k-tabdemo"><i class="tab-knob-demo">${art('crate_toolbox', 44, 44)}</i><b>CRATES</b></div>
      <div class="k-tabdemo idle"><i class="tab-knob-demo">${art('coil_3', 36, 36)}</i></div>
      <div class="k-tabcap">${cap('active tab: lifted, glow, label. inactive: icon only')}</div>
    </div>
    <div class="k-sec k-type">
      <div class="ty t1">Lilita One title</div>
      <div class="ty t2">Body text on cream, 15 px and up</div>
      <div class="ty t3">1,240 · 0:52 · x7 · 18%</div>
    </div>
  </div>`;
  return { id: 'kit-3', group: 'system', title: 'UI kit 3: panels, rows, tabs, type', note: 'Panel anatomy, header ribbons in four role colours, list rows, nav tab states, type samples (Lilita One only; Nunito is not bundled in the repo).', html };
}

export function systemScreens() {
  return [settingsScreen(), kit1(), kit2(), kit3()];
}
