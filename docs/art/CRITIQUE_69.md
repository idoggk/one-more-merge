# CRITIQUE_69: map badge batch 1 (27 pieces) + rank redo 1 (7 pieces)

Independent critic pass (t-aa7cfeb0). Every piece opened and judged at full size, 70/64/48 px, grayscale, on dark and cream backgrounds. Evidence in `art-candidates/critic-69/` (`badges_64.png`, `badges_64_gray.png`, `badges_48.png`, `all_light.png`, `rank_pairs.png`, `strip_*.png`). Sources: branches `orch/t-7a7ea2eb-...` (badges) and `orch/t-14819aae-...` (ranks). Machine-readable list: `art-candidates/critic-69/keep-list.json`.

Totals: badges 22 KEEP / 5 FIX / 0 REDO. Ranks (8 files on the branch, the task called it 7) 5 KEEP / 3 FIX / 0 REDO.

## A. Map badge batch 1

Measured: no piece touches its slice edge (0 opaque px in the outer 2 px, so rubric 16 passes). Ready-glow bases carry ~3,200 semi-transparent pink px each (about 60% of the glow). Everything else has under 30 (daily_open 491 is the pink sparkle, urgent ribbon 131 is red edge, both ignorable).

Contact sheet: each base + glyph + (ribbon / dot / padlock) composited on a green game-like ground, 3 families x 3 states x 9 glyphs.

**Does the set work as a system? Mostly yes.** Outline weight, warm dark-brown outline, top-left light and the glossy-dome language match across all 27. Family resemblance with the popup/medallion language is good.

### Findings

1. **States: locked reads apart, ready does not (grayscale).** Locked is clearly darker, with the slate dome and padlock plate. Idle and ready are the same dome plus a pale halo; in grayscale the halo is only a slightly lighter ring, so they merge at 48 px. In colour the halo is pink, not gold, because of the magenta key. Fix in the ready bases (items 3, 14) or draw the glow in code on the idle base and drop the baked glow.
2. **Families: brass and copper idle are close in grayscale** (both mid-bright domes with a golden ring). Colour carries it, which is acceptable if the road never relies on grayscale for family. Locked bases are the same blue-grey dome in all three families; only the ring differs, so family barely reads when locked. Acceptable (a locked node should look dull), but tint the dome per family if the road shows mixed families.
3. **Glyphs are all distinct** (nine different silhouettes: gift, flag, crate, medal, scroll, book, envelope, open gift, open envelope). Daily closed/open and mail closed/open read as intended state pairs. Weak ones: the flag (thin pole, 3 px at 48) and its blue on the teal and blue-grey bases; the brown crate vanishes against copper.
4. **Parts:** timer ribbons (cream / red / grey) share a shape and read apart in grayscale (cream vs red vs grey values differ). Count bubble is gold-on-gold and lacks the cream rim the dots have, so it disappears on brass. NEW tag and padlock are good. Gear-clock cap is baked into the ribbon, so the number needs to be code text and the ribbon cannot be shortened.
5. No baked text or letters anywhere (rubric 15 passes). Slices are 256-286 px, still to scale.

### Per piece

| Piece | Verdict | Score | Fails | Fix note |
|---|---|---|---|---|
| badge_base_brass | KEEP | 18 | 12 | Grayscale close to copper; none needed |
| badge_base_brass_ready | FIX | 14 | 14, 12 | Re-key the glow: replace the pink fringe with warm gold/white and raise the dome value so it differs from idle in grayscale |
| badge_base_brass_locked | KEEP | 18 | 12 | Dome is shared across families (note only) |
| badge_base_copper | KEEP | 18 | 12 | Same note as brass |
| badge_base_copper_ready | FIX | 14 | 14, 12 | Same as brass ready; glow gold-white, not pink |
| badge_base_copper_locked | KEEP | 18 | none critical | Ring vs brass locked is subtle |
| badge_base_teal | KEEP | 19 | none | Best of the idle family; reads apart from brass/copper in grayscale |
| badge_base_teal_ready | FIX | 14 | 14, 12 | Pink halo clashes hardest on teal; use a white-mint glow |
| badge_base_teal_locked | KEEP | 18 | none | |
| glyph_daily | KEEP | 19 | none | Strongest glyph |
| glyph_daily_open | KEEP | 18 | 18 | Sparkle plus lid is busy but readable at 64; check at 48 |
| glyph_events | FIX | 15 | 11, 12 | Flag too thin at 48; thicken the pole and flag to ~2x, change the blue to white/cream or yellow so it separates from teal and slate |
| glyph_offers | KEEP | 17 | 12 | Brown crate low contrast on copper; add a lighter rim or cream tag. Also consider a coin or price-tag glyph, since crate is semantically weak for offers |
| glyph_season | KEEP | 19 | none | |
| glyph_quests | KEEP | 18 | none | |
| glyph_album | KEEP | 18 | none | Dark red book on red-ish copper is the weakest pairing |
| glyph_mail | KEEP | 19 | none | |
| glyph_mail_open | KEEP | 18 | none | |
| ribbon_timer | KEEP | 18 | 18 | Cap baked in (see above) |
| ribbon_timer_urgent | KEEP | 18 | 18 | |
| ribbon_timer_expired | KEEP | 18 | 18 | |
| ribbon_count | KEEP | 18 | none | Blue is the only blue in the kit, fine as a count colour |
| count_bubble | FIX | 14 | 12, 19 | Make it red or cream-rimmed (same rim as the dots); gold on a gold base cannot be seen |
| dot (red) | KEEP | 19 | none | Cream rim works on dark and light |
| dot_green | KEEP | 19 | none | |
| new_tag | KEEP | 18 | none | |
| lock (padlock plate) | KEEP | 19 | none | Reads at 48 in grayscale |

Prompt fix for the 5 FIX pieces:
- Ready bases (3): "same dome as the idle base, with a soft WHITE-GOLD outer glow and a brighter top highlight, no pink or magenta in the glow; key on solid #00FF00 or a flat colour that does not appear in the glow." (The pink comes from the magenta key; a green key plus a warm glow avoids it.)
- Flag glyph: "bold yellow pennant on a thick brown pole, simple three-point flag, fills 70% of the cell".
- Count bubble: "red round bubble with a cream rim, same outline as the red dot, empty centre."

## B. Rank redo 1

Reran `tools/rank-clarity.mjs` (from `orch/t-6ddeece4-...`) over router, vice, rivet_gun, piston with the 8 redrawn pieces placed over the audit pieces. The tool applies its own rule: at least 2 of 4 channels (silhouette, size, colour, edges) must differ. Almost every pair fails that rule because size is always near 1 (pieces were normalised to a 250 px box), so the score is the more useful number. Strips and `rank_pairs.png` looked at by eye.

| Pair | Score | Eye check |
|---|---|---|
| router 7-8 | 37.1 | Clear: tower with emerald domes vs wide crown ball. Silhouette, part count, accent all differ. |
| vice 2-3 | 31.2 | Clear at 110 px; at 70 px grayscale both are a blue block with jaws. |
| vice 3-4 | 32.7 | Clear (hump to tall column). |
| vice 4-5 | 34.6 | Clear but out of order, see below. |
| vice 5-6 | 34.5 | OK |
| vice 6-7 | 25.0 | Still twins (not in scope of the redo). |
| rivet_gun 7-8 | 42.2 | Very clear: wings, red dial, emerald tank, triple stack. |
| rivet_gun 5-6 | 20.7 | Still near-twin (not redone). |
| piston 3-4 | 31.4 | Single barrel vs V-twin: clear in silhouette, colour identical. |
| piston 4-5 | 27.4 | Below 30; V-twin vs wide triple-barrel box. Different but both are red-gold barrels on a cream base, so at 70 px grayscale they read as "more barrels". |
| piston 7-8 | 38.8 | Clear: wings and gems. |

### Per piece

| Piece | Verdict | Reason and fix |
|---|---|---|
| router_8 | KEEP | Tall silhouette, new parts, green accent; fully distinct from 7. |
| vice_3 | KEEP | Twin-jaw hump; differs from 2 and 4 in silhouette. |
| vice_4 | FIX | A tall screw tower reads as a different machine and is grander than rank 5, so the progression goes backwards (4 > 5). Prompt: "same vice as rank 3 with one bigger central screw column and a small gold dial, no more than 15% taller; keep the jaws". |
| vice_5 | FIX | Back to a plain wide vice with red bars that is hard to tell from rank 2 (compare strips). It needs to be more elaborate than 4: "vice with double gold-capped jaws, a brass dial, a green gem, and a small crown nub, 8% bigger than rank 4's footprint". |
| rivet_gun_8 | KEEP | The best of the set. Notice the brass wings are the same motif as piston_8; keep wings as the shared rank-8 cue, which is good for rank grammar. |
| piston_4 | KEEP | V-twin silhouette is clear. |
| piston_5 | FIX | Still 27.4 (the author said so too). Change the silhouette, not parts count: "tall upright triple-barrel fan pointing up, narrower than rank 4, with the emerald tank on the left", so the outline differs from the wide V-twin. |
| piston_8 | KEEP | Wings and gems; clear vs 7. |

Not covered by this redo (still failing in the rerun): vice 1-2 (21.1), vice 6-7 (25.0), rivet_gun 5-6 (20.7), router 4-5 (28.3), and vice rank 8 has no piece at all.

## C. Rules to carry forward

- Key on green (or a colour absent from glows) when a piece has a soft glow. Magenta keying leaves pink in semi-transparent edges (measured 3,200 px per glow base).
- Rank pieces must escalate: a higher rank is never plainer than the one below (vice 4 vs 5).
- Use a shared rank-8 cue (wings) and a shared rank 6-7 cue (crown). Do not invent a new cue per unit.
- The tool's size channel is meaningless after box normalisation; judge by silhouette, edges and the eye check.
