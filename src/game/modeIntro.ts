// Walkthrough 3 (FIX 6): the first Challenge and the first Remix open with one card before the clock starts: what the
// mode is, that the board fills fast, and that SCRAP is the way out. Shown once per mode (meta.tips[id]) through
// GameScene.explain(), which pauses the clock and counts the card in the tip budget (tips.ts; these runs are not saga
// levels, so the budget always admits them).

export interface ModeRun {
  hard: boolean;
  remix: unknown;
  level?: number;
  daily?: string;
  bounty?: unknown;
  rush?: unknown;
  puzzle?: unknown;
  endless?: number;
}

export const MODE_INTRO = {
  mode_challenge: 'CHALLENGE\nOne long run of tougher machines.\nThe board fills FAST here.\nSCRAP is your friend: drag a spare part\nonto SCRAP (bottom right) to free a cell.',
  mode_remix: 'REMIX\nA classic machine with its own trick\nthat messes with your board.\nThe board fills FAST here.\nSCRAP is your friend: drag a spare part\nonto SCRAP (bottom right) to free a cell.',
} as const;

export type ModeIntroId = keyof typeof MODE_INTRO;

/** The intro card this run should open with, or null (saga levels, dailies, bounties, rush, puzzles, endless). */
export function modeIntroFor(s: ModeRun): ModeIntroId | null {
  if (s.level !== undefined || s.daily || s.bounty || s.rush || s.puzzle || s.endless) return null;
  if (s.remix) return 'mode_remix';
  return s.hard ? 'mode_challenge' : null;
}
