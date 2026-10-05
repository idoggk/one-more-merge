import type { PerkId } from '../core/types';

export const PERKS: Record<PerkId, { name: string; text: string; icon: string }> = {
  twin: { name: 'TWIN BURST', text: 'Chain cannon shots +40%', icon: 'cannon' },
  leads: { name: 'LONG LEADS', text: 'Coils reach one extra tile', icon: 'coil' },
  encore: { name: 'ENCORE', text: 'Long chains hit harder', icon: 'bell' },
  juice: { name: 'EXTRA JUICE', text: 'Overdrive sooner, lasts longer', icon: 'bolt' },
  quality: { name: 'QUALITY PARTS', text: '1 in 4 parts arrive upgraded', icon: 'crate' },
};

export const FAMILY_INFO = {
  cannon: { name: 'Cannon', color: 0xe8452c, text: 'Fires on its own. Fires hard when a chain wakes it.' },
  coil: { name: 'Coil', color: 0x27c4e0, text: 'Zaps neighbours and charges them. Rank 2+ reaches 2 tiles.' },
  bell: { name: 'Bell', color: 0xf2b521, text: 'Rings its whole row. Rank 2: +up/down. Rank 3+: +column.' },
} as const;

export const TARGET_NAMES = ['TIN CAN', 'MAD FRIDGE', 'JUNKZILLA'];
