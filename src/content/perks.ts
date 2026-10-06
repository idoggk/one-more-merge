import type { PerkId } from '../core/types';

export const PERKS: Record<PerkId, { name: string; text: string; icon: string }> = {
  twin: { name: 'TWIN BURST', text: 'Chain cannon shots +40%', icon: 'cannon' },
  leads: { name: 'LONG LEADS', text: 'Coils reach one extra tile', icon: 'coil' },
  encore: { name: 'ENCORE', text: 'Long chains hit harder', icon: 'bell' },
  juice: { name: 'EXTRA JUICE', text: 'Overdrive sooner, lasts longer', icon: 'bolt' },
  quality: { name: 'QUALITY PARTS', text: '1 in 4 parts arrive upgraded', icon: 'crate' },
};

/** One role word, one power sentence, one hint per family (ChatGPT r14 clarity ruleset: fixed shapes, rank = damage). */
export const FAMILY_INFO = {
  cannon: { name: 'Cannon', color: 0xe8452c, role: 'SHOOTER', text: 'Shoots by itself, weakly. Woken by a chain it fires a FULL shot. Wakes nobody.', tryThis: 'Put Cannons where Coils and Bells can reach them.' },
  coil: { name: 'Coil', color: 0x27c4e0, role: 'RELAY', text: 'Hits the monster and wakes OTHER gadgets up to 2 cells away: up, down, left, right.', tryThis: 'Put Cannons inside its cross.' },
  bell: { name: 'Bell', color: 0xf2b521, role: 'RELAY', text: 'Hits the monster and wakes every OTHER gadget in its row.', tryThis: 'Fill its row with Cannons and Coils.' },
  battery: { name: 'Battery', color: 0x7ccf2e, role: 'SUPPORT', text: 'Charges one Cannon next to it: its next chain shot hits x1.5.', tryThis: 'Park it beside your biggest Cannon.' },
  fan: { name: 'Fan', color: 0x7fc8f0, role: 'MOVER', text: 'Pushes one gadget next to it one cell away.', tryThis: 'Use it to open space or line pieces up.' },
  magnet: { name: 'Magnet', color: 0xc23fd1, role: 'MOVER', text: 'Pulls one gadget along a straight line into the empty cell beside it.', tryThis: 'Use it to bring pairs together.' },
} as const;

export const TARGET_NAMES = ['TIN CAN', 'MAD FRIDGE', 'JUNKZILLA', 'VACUUM VIPER', 'TOASTER TWINS', 'PIANO-SAURUS'];
