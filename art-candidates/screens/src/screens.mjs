// Aggregates all mockup screens for tools/build.mjs
import { makeDefs } from './lib.mjs';
import { homeScreens } from './s-home.mjs';
import { metaScreens } from './s-meta.mjs';
import { levelScreens, momentScreens } from './s-level.mjs';
import { systemScreens } from './s-system.mjs';

export const groups = [
  { id: 'home', title: 'Home', note: 'Two layout variants. Same kit, same rules; only the hero area differs.' },
  { id: 'tabs', title: 'Road and tabs', note: 'Level road, Units, Machine, Crates.' },
  { id: 'level', title: 'Level flow', note: 'Pre-level card, in-level HUD, win and lose.' },
  { id: 'moments', title: 'Big moments', note: 'Crate opening and the new-unit reward popup.' },
  { id: 'system', title: 'System and kit', note: 'Settings and the UI kit specimen sheets.' },
];

export const defs = makeDefs();
export const screens = [...(await homeScreens()), ...(await metaScreens()), ...levelScreens(), ...momentScreens(), ...systemScreens()];
