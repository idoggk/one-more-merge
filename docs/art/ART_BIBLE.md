# One More Merge: Art Bible

**Single source of truth for how the game looks, moves and sounds.** Written for workers (read sections 1-3 and your slice in section 13) and for the owner (read sections 1, 6, 8 and 13).

Status: v1, 2026-10-11, mission m-b6e8ac1d. Companion docs: `TEARDOWN.md` (what top games do), `AUDIT.md` (what we have today), `ASSET_HUB_DESIGN.md` (where assets get tracked). Numbers (ms, px, scale) are starting values: tune by eye on a real phone, then write the final value back here.

Owner brief (2026-10-11): "our game looks mid; make it amazing: ALL assets (progress bars, buttons, menus, everything), all units, their shooting, interaction and trigger."

**Rule zero for workers:** do not invent a second look. If a thing is not in this document, copy the nearest thing that is, and add a line to section 14 (open questions) so the Lead can extend the Bible.

---

## 1. The style in words (ONE direction)

**Chunky toy-like workshop gadgets, seen in 3/4 view, glossy enamel on a warm workbench.**

This continues the existing ChatGPT unit art (Cannon, Coil, Bell and the 14 other painted units), which is the best-looking thing we have. Everything else (UI, effects, backgrounds, the 22 code-drawn units) moves toward it. We do not restyle the painted units.

The look, in seven rules:

1. **Shape**: fat, rounded, toy-like. Big simple silhouettes that read at 118 px. No thin spindly parts; the smallest detail must survive at ~60 px (tray size).
2. **Outline**: thick dark outline on every object (about 4-5% of the object's width). The outline is a *dark tint of the object's own hue* (dark brown on wood/brass/cream, dark navy on blue, dark maroon on red). **Never pure black.** The UI ink colour is `#2b1d2e` (a plum-black) and is the only near-black allowed.
3. **Material**: glossy enamel paint, brass trim, rivets and bolts, cream base plate. One soft white highlight blob + one thin specular streak per object, a darker bottom edge (the "lip").
4. **Light**: one direction for everything, **from the top-left**. Highlights top-left, core shadow bottom-right, a soft rim light on the bottom-right edge, cast shadow falls down-right. This applies to units, UI buttons, panels, crates, icons and effects.
5. **Corners**: ONE corner-radius family = one proportional rule, **radius = 18% of the shorter side, clamped to 16-36 px** (small elements land on 16, cards on 24, big panels on 36 as `panel()` has today; pills use half their height). These three values are steps of the one rule, not three styles. Never mix a sharp and a rounded corner on the same screen. Circles are allowed for coins, gems, dials.
6. **Colour**: saturated mid-values, warm bench background, cool accents. Colour carries meaning (section 2 roles). Gradients are two-tone (light top-left to darker bottom-right), never rainbow.
7. **Tiers change the silhouette, not only the number**: rank 1 is plain; every two ranks add a visible part (more barrels, bigger bell, brass trim at rank 3, gold trim and glow at rank 5, crowned/MAX streak at rank 6). Rarity shows as frame colour + trim metal (section 2).

Reference sheet for the look: `cannon_4.webp`, `coil_3.webp`, `bell_3.webp`, `btn_green.webp`, `btn_blue.webp`, `ui_card.webp`, `tray_plate.webp`.

**Do not**: flat rectangles; mixed corner radii; pure-black outlines; mixed icon styles (one painted style only); photoreal textures; thin 1-2 px lines on art that is scaled down; text baked into art (text is always live Phaser text, so it can be localised and re-coloured); blurry up-scaled sprites (author at 2x the display size, see section 12).

---

## 2. Palette

Hex values come from three sources, marked: **[code]** read from `src/` (authoritative), **[art]** sampled from the shipped WebP files (quantised to 32 steps, so approximate: treat as the family, then pick the exact value by eye), **[new]** proposed here.

### 2.1 Core neutrals
| Role | Hex | Source |
|---|---|---|
| Ink (outlines, text outline, dark UI) | `#2b1d2e` | [code] `sceneKit.ts` |
| Cream (panel face, plates) | `#fbe7c6` | [code] `panel()`, codeBox |
| Cream shade (panel inset / well) | `#e0c0a0` | [art] tray_plate, ui_card |
| Warm brown (bench, slot, wood) | `#c08040` / `#a06020` / `#804020` | [art] bg, slot |
| Brass | `#e0a040` light, `#c08020` mid, `#a06020` dark | [art] coil_3, bell_3 |
| Enamel highlight | `#ffffe0` | [art] ui_card |
| Text on cream | `#5a3a2a` | [code] tray label |
| Text on dark | `#fbe7c6` or white | [code] |

### 2.2 UI colour roles (fixed; a colour never changes meaning)
| Role | Face | Lip (darker) | Outline | Source |
|---|---|---|---|---|
| **Primary / Play / Claim** (yellow-gold) | `#ffcf33` | `#e0a020` | `#7a4a10` | [code] MAX `0xffcf33`; lip/outline [new] |
| **Go / Confirm / Buy** (green) | `#40c060` | `#20a060` | `#14553a` | [art] btn_green |
| **Secondary / Info** (blue) | `#40a0ff` | `#2080e0` | `#144a8a` | [art] btn_blue |
| **Danger / Close / Notification** (red) | `#ff4020` | `#c0301a` | `#6a1810` | [art] btn_red |
| **Neutral / Disabled** (grey) | `#9aa4ae` | `#7a848e` | `#4a525a` | [new] |
| **Special / Premium** (purple) | `#9a63ff` | `#7a43e0` | `#3e2380` | [code] epic `0x9a63ff` |

Background UI is calm: cream and warm brown; the only saturated things on a screen are the primary button, rewards and the board.

### 2.3 Rarity (frames, glows, crate tiers) [code] `RARITY_COLOR`
| Rarity | Hex | Trim metal |
|---|---|---|
| Common | `#8a9aa8` | steel |
| Rare | `#3a8adf` | blue-steel / silver |
| Epic | `#9a63ff` | purple enamel + silver |
| Legendary | `#f0b020` | gold, soft glow, sparkles |

### 2.4 Game-meaning marks [code] `PALETTE` in `src/core/marks.ts`
| Meaning | Hex |
|---|---|
| Your merge (white ring) | `#ffffff` |
| Boosted (amp) | `#d2b4ff` |
| Charged | `#9be05a` |
| Power-up tool | `#ff4fd8` |
| MAX | `#ffcf33` |
| Boss attack | `#ff684a` |
| Locked / clamped | `#4f6d8f` |
| Overdrive | `#ff7200` |
| New parts | `#3fd9a0` |
| Kickback | `#6f6cff` |

Do not reuse these hues for decoration; they are language.

### 2.5 Unit family colours [code] `FAMILY_INFO.color` (used for shots, links, sparks, auras)
Cannon `#e8452c` · Coil `#27c4e0` · Bell `#f2b521` · Battery `#7ccf2e` · Fan `#7fc8f0` · Rocket `#ff8a3c` · Mortar `#6a7a3a` · Arc Welder `#3a6aff` · Horn `#d09030` · Fuse Box `#e04a8a` · Amplifier `#30b0a0` · Signal Beacon `#f05030` · Magnet `#c23fd1` · Nail Gun `#8a96a8` · Jackhammer `#d8a020` · Gear `#9a7a5a` · Saw Blade `#c8d0d8` · Wrench `#c8a050` · Piston `#d05a3a` · Spring `#7ac060` · Belt Drive `#6a7a90` · Blowtorch `#ff7a1a` · Pipe `#6a9a8a` · Blast Plate `#8a8fa8` · Tesla Tower `#6ad0ff` · Capacitor `#3aa6c8` · Blueprint `#4a78c8` · Ladder `#c89a3a` · Rewind Crank `#8a6ac8` · Crane `#e0a020` · Dynamo `#d04a8a` · Wrecking Ball `#6a7a8a` · Robot Arm `#5a8ad0` · Tilt Lever `#d08a3a` · Rivet Gun `#d89030` · Vice `#8a8a96` · Router `#4aa08a` · Hydraulic Press `#3a7ac0` · Lathe `#c0a040`.

Several are close (Piston/Cannon, Gear/Ladder/Crane). Effects must therefore differ by **shape and motion**, not only colour (section 7).

### 2.6 Damage-number colours [new]
Normal white `#ffffff` with ink outline; chain hit warm `#ffd84a`; crit orange `#ff8a1a` larger; heal/charge green `#9be05a`; boss weak-point magenta `#ff4fd8`.

### 2.7 Chain counter ladder [new]
x1-x4 white `#ffffff` → x5-x7 yellow `#ffe14a` → x8-x11 orange `#ff9a1a` → x12+ red `#ff4020`. (Today it only goes white to gold at 8+.)

---

## 3. Typography

- **Display font: Lilita One** (already bundled via @fontsource, ~210 uses). It stays: chunky, rounded, matches the toy look. Used for titles, buttons, numbers, banners, damage numbers.
- **Body font: one rounded sans, bundled**, to replace the Arial / Arial Black / Georgia mix (68 + 8 + 1 uses). Candidate: Nunito ExtraBold/Bold (via @fontsource) [open question 14.2]. Used for card text, descriptions, captions.
- **Numerals**: tabular figures for every number that changes (timers, currency, damage). Whether Lilita One's digits are tabular is unverified: S1 must test it (render "1111" and "0000" and compare widths); if not tabular, set a fixed-width text container so numbers do not jitter when counting.

Text style presets (build once, in one module `src/game/ui/textStyles.ts`, slice S1):

| Preset | Font / size (design px) | Fill | Outline (colour, width) | Hard shadow |
|---|---|---|---|---|
| title | Lilita 56 | white | ink-tint of context, 8 | 0,4 ink 60% |
| button | Lilita 36 (primary 44) | white | button outline colour, 5 | 0,3 outline colour |
| number-pop | Lilita 34-60 by size of hit | white | ink, 6 | 0,3 ink 50% |
| crit-pop | Lilita 60-72 | `#ff8a1a` | ink, 7 | 0,4 ink |
| chain | Lilita 64-96 growing with chain | ladder colour (2.7) | ink, 8 | 0,5 ink |
| currency | Lilita 30 | white | ink, 5 | 0,2 ink |
| body | Nunito Bold 24 | `#5a3a2a` on cream | none | none |
| caption | Nunito Bold **22 minimum** | `#5a3a2a` | none | none |

Rules: outline is a coloured dark tint (never pure black); minimum on-screen size 22 design px (a 12 px caption is ~6.5 pt on a phone); no all-caps paragraphs; no text on top of busy art without an outline.

---

## 4. UI kit spec

All sizes are design px on the 720-wide canvas. Every component lives in its own file under `src/game/ui/kit/` (new folder) and is a function `fn(scene, ...)`, as the rest of `src/game/ui`. All timings use Phaser tweens (so they never pause the sim) and respect the "reduce motion" setting where it exists.

### 4.1 Buttons
- **Pill**, height **56-64**, min width 160, radius = half height. Primary: height 72-80.
- Anatomy (matches the shipped `btn_green.webp` / `btn_blue.webp`, which are the style target): a **dark plum base** (`#2b1d2e`-tinted, the outer edge) → a **cream/brass bezel ring** (cream `#fbe7c6` with a brass `#e0a040`→`#a06020` edge, 5-8 px wide) → the **2-tone enamel face** (light top-left) with a **4-6 px darker lip** along the bottom and a top gloss strip (white 25%, upper 40% of the face). **Brass rivets**: one small round rivet (8-10 px, brass with a highlight dot) at each end of the pill, centred vertically (the art puts them in the bezel). The role colour (2.2) fills the face; the outline of the face is its darker tint, 4 px. A button without bezel and rivets is not a kit button. Before S1 bakes anything, the worker must open `btn_green.webp` at full size and copy bezel width and rivet size from it, then write the measured values back here.
- Press: scale **0.95 in 70 ms**, face drops by the lip height (lip disappears). Release: overshoot **1.04 then 1.0 in 140 ms**. Haptic tick + `sfx.click`.
- **Primary** buttons breathe 1.0 to 1.05 over 1.2 s (sine, yoyo) and run a **shine sweep** (diagonal white 30% band) every 3-4 s.
- Disabled: grey (2.2), no breathing, **a reason is shown** (small caption under it or a toast on tap: "Needs 3 bolts").
- Variants: primary, go, secondary, danger, neutral, premium; icon button (64 round); close button (56 round, red, top-right of popups); tab (see 4.9).
- Art: 9-slice pill per colour (S5 art; until then baked in code by the S1 helper). Existing `btn_green/blue/red` (+ `_pressed`) stay valid and are the style target.

### 4.2 Panels
- Anatomy (same family as the buttons, matches `ui_card.webp` / `tray_plate.webp`): dark plum outer edge (ink `#2b1d2e`, 8-12 px) → **brass trim line** (3-4 px, `#e0a040`→`#a06020`) → **cream bezel** → **darker inset** (cream shade `#e0c0a0` well) → face (cream `#fbe7c6`), radius 36, soft shadow (0,8 ink 35%). **Brass rivets** in the four corners of popup/card panels (10 px), omitted on small tooltips and list rows. Header ribbon sits over the brass trim.
- **Header ribbon**: a coloured banner overlapping the top edge, 72 px high, title in `title` preset. Role colour by panel type (blue info, green shop, red warning).
- 9-slice, one atlas frame per panel type: standard, popup, card, inset well, tooltip bubble.

### 4.3 Bars (HP, XP, energy, timer, overdrive)
- Height 36-50, **rounded caps**, dark plum inset track inside a thin **cream/brass bezel** (3-4 px, same family as buttons; small brass rivet at each end on bars >= 40 high), fill with 2-tone gradient + **gloss strip** across the top third.
- **Shine sweep** every 2-3 s across the fill.
- **Lag bar**: the fill moves to the new value in **150 ms**; a pale trail (white 50%) lags and catches up after **+400 ms**.
- Colour: green `#40c060` → yellow `#ffcf33` → red `#ff4020`; goes red below **30%**, **pulses (scale 1.0-1.04, 0.5 s) below 20%**.
- Segmented/milestone variant: tick marks + star icons at thresholds; stars pop when passed.
- Boss HP: wider (frame art `hp_frame`), armor ticks, phase pips.

### 4.4 Popups / modals
- Dim backdrop **60%** ink. Not full-screen: panel max 88% of width. Tap outside closes (unless it is a reward or a confirm).
- Enter: scale **0.8 to 1.0 back-out in 220-280 ms** + fade; Exit: **150 ms** scale 1.0 to 0.9 + fade. (Today's behaviour is a slide + fade, about 220 ms: unverified, check `ui/` popup code in S1 before replacing.)
- Reward popups: a **rotating shine** (soft radial rays, 8 s per turn) behind the item; the item pops 0-1.3-1.0.
- Max one popup level deep.

### 4.5 Star rows
- Three stars, empty (dark slot) then pop one by one, **150-200 ms apart**, each scale 0 → 1.3 → 1.0 (back-out, 260 ms) with a pitch step per star (`sfx.star` rising) and a small sparkle burst. Existing results behaviour (220 ms stagger, Back.Out 260 ms) already matches: keep it and extract it into the kit.

### 4.6 Currency pills
- Pill 54 high, dark inset, **icon overlaps the left edge** (icon 64, pill 54), number in `currency` preset, optional "+" button for buyable currencies.
- Gain: number **counts up 400-600 ms**; **coins fly** from the source to the pill, staggered 40-60 ms, arcing, each landing bumps the pill (scale 1.0 → 1.12 → 1.0, 120 ms) and ticks a rising pitch.
- Spend: number counts down, pill shakes 4 px.

### 4.7 Toggles and sliders
- Toggle 96x48, knob 40, on = green with check, off = grey; knob slides in 120 ms with a 1.1 overshoot.
- Slider: track 14 high rounded, filled part in role colour, knob 44 with lip + gloss; value bubble while dragging.
- Section headers in settings use a small ribbon.

### 4.8 Badges
- Rarity gem/frame, NEW (red ribbon, pulses), lock (steel + padlock), cap (merge budget), level, rank pips (small dots, brass), family chip, copy-count chip.
- Notification: red dot 22 px with white outline; count badge (red circle, number in `currency`); "ready" glow on a claimable crate (pulsing gold ring).

### 4.9 Tabs and nav
- Bottom nav bar, **4-5 tabs**, in the lower thumb zone. Active tab: raised pill highlight, icon scales 1.15 and bounces on switch (160 ms), label shown only on active.
- Icon set: one painted style, one outline weight (the icon category of the asset taxonomy in `TEARDOWN.md`). No icon mixes painted and glyph styles. Inventory in 4.11.

### 4.10 Toasts and banners
- Toast: pill under the header, slides down 24 px + fade in 180 ms, holds 1.6 s, fades 200 ms. Max 2 stacked.
- Banners (CHAIN x5, OVERDRIVE, BOSS): see section 6.6 and 6.8.

### 4.11 Icon inventory (one painted style, 64x64 authored, readable at 32)
- **Currencies**: bolt, scrap, gem/premium, coin/parts, key, ticket (crate), star (filled/empty/gold).
- **Nav tabs** (each with active and idle variant): road, machine, units, crates/shop, events.
- **Role icons** (the `job_*` glyph family, white with outline): shooter, relay, support, card, plus one per family glyph already in `job_*`.
- **Settings and system**: sound, music, vibration, screen shake, language, reduce effects, pause, resume, restart, home, back, close, info, help, lock, padlock, check, cross, plus, minus, arrow, share.
- **Status and marks**: notification dot, NEW ribbon, cap/merge-budget, clock/timer, bolt (energy), skull-gear (boss), crown (MAX), shield, fire (streak).
- **Rarity gems**: common, rare, epic, legendary.
- The inventory is the checklist for S5 batch 4; each entry becomes an `icon_<name>` key (section 10).

### 4.12 List rows and settings rows
- **List row** (units roster, events, bounties): 96 high, cream face with the panel edge treatment of 4.2 minus rivets, left icon/portrait tile 72, title (body-bold 26) + caption (22) stacked, right side = status chip or chevron. Pressed: 0.98 scale, 70 ms. Rows separated by 8 px, never by hairlines.
- **Settings row**: 88 high; label left, control right (toggle 4.7, slider, segmented off/soft/full, or a button); section header ribbon above each group; the whole row is the touch target.
- **Segmented control**: pill track, sliding raised thumb in the role colour, 56 high.

---

## 5. Units

### 5.1 Presentation standard (all 39 units)
- Painted sprite, 256x256 source, ~118 px in cell, 3/4 view, dark tinted outline, light top-left, cream base plate visible under the body.
- A soft **shadow ellipse** under every unit (ink 30%, 70% of cell width).
- **Idle breath** 1-2% scale, 2.4 s sine, phase offset per cell so the board does not pulse in unison. Paused during animations of that unit.
- **Rank**: the **playable cap is rank 6** (README). Some existing files go to `_8` (legacy/unused ranks); do not author or require ranks 7-8 for new units, and do not treat them as shipped behaviour. Silhouette grows (section 1 rule 7). Rank number sits in the existing `dice_N` badge. MAX = crown + family streak.
- **Rarity** = frame on cards/portraits and trim metal on the unit.
- Poses: **idle** (default), **attack** (shooters: 2-frame recoil/kick for 120 ms, may be done by code squash for v1), **hit** is not needed (units are not hit).
- Units without art use a **glyph tile** that must look intentional: rarity-framed rounded tile, family-colour gradient, the white `job_*` glyph with outline, rim light. Never a bare rectangle.

### 5.2 The 22 code-drawn units (placeholder until S5)
Wrench, Piston, Spring, Belt Drive, Blowtorch, Pipe, Blast Plate, Tesla Tower, Capacitor, Blueprint, Ladder, Rewind Crank, Crane, Dynamo, Wrecking Ball, Robot Arm, Tilt Lever, Rivet Gun, Vice, Router, Hydraulic Press, Lathe. Each needs ranks 1-6 in the painted style (132 images). Priority: Common and Rare first (Wrench, Piston, Spring, Rivet Gun, Vice, Blowtorch, Pipe, Router, Blast Plate), then Epic, then Legendary (Tesla Tower, Crane, Dynamo, Robot Arm, Tilt Lever). Rarity assignments follow `docs/ROSTER.md`; where this list disagrees, ROSTER.md wins.

---

## 6. Effects spec

Principles: (1) **every action has anticipation, impact, and settle**; (2) effects scale with importance (a rank 2 merge is small; a x10 chain is huge); (3) **animations never pause the simulation** (repo invariant): slow-mo and hit-stop are visual only and use camera/time scale on presentation objects, not the model tick; (4) an **effect budget**: at most 12 damage numbers and 80 live particles at once, oldest dropped first; (5) screen shake is **camera only**, respects the existing setting (off/soft/full), and is never used on routine hits; (6) every long celebration is skippable by tap.

Timings are starting values.

### 6.1 Shoot
1. **Muzzle flash**: additive, **60-80 ms**, family colour core + white centre, sized to unit.
2. **Recoil**: the unit kicks back **4-6 px** opposite the target, returns in 100 ms (ease-out).
3. **Projectile**: per-family shape (section 7), travel 200-230 ms, with a **6-10 segment trail** that fades over **150-250 ms**.
4. **Sound**: per-family voice, pitch randomised **±5-8%**.

### 6.2 Hit (on monster/boss)
- **White flash** 60-90 ms (additive overlay or tint-fill), then back.
- **Squash** 1.15 wide x 0.85 tall in **120 ms**, return with a small overshoot.
- **Knockback** 3-6 px away from the source, return 140 ms.
- **Damage number** rises **40-60 px over 650 ms**, with ±8 px horizontal jitter and a small random rotation (±6°), scales 1.2 → 1.0 in the first 80 ms; colours per 2.6; crits bigger and orange.
- **4-8 sparks** in the family colour at the impact point (per-family shape, section 7).
- Hit-reaction strength scales with chain length (the audit reports a very small squash today, about 1.5-2.5%, not re-measured; S2 must confirm the current value before changing it).

### 6.3 Kill
- Target scales 1.2 then collapses to 0 with a flash, **ring** expanding 1.5x in **200 ms**, debris + sparks (existing 70 debris / 50 sparks, keep, but vary tint per monster).
- **Coin(s)/parts arc to the pill** (fly-to-pill, 4.6).
- Sound: kill thud + rising chime.

### 6.4 Merge
1. **Pull-in 80 ms**: the two parts slide together with a squeeze.
2. **Flash** (white, 60 ms) and **ring** (family colour, expands to 1.6x in 220 ms).
3. **New unit pops 0 → 1.3 → 1.0 in 260 ms** (back-out).
4. **12-20 sparkles** in the family colour, count and size scaled by rank (rank 2: 8 small; rank 5+: 20 with gold).
5. **Pitch climbs per chain step** (`sfx.ladder`), merge sound by rank.
6. Camera shake **2-4 px** only at rank 4+ merges.
- **Sandwich merge** (owner: "just happens, didn't feel like it happened"): needs a *visible moment before* (preview outline + arrow, held ~250 ms) and an *impact after* (hit-stop 160 ms, gold plate slam, ring, 10 sparks, a distinct "chunk" sound, camera shake 4 px).

### 6.5 Trigger (chain link wakes a unit)
Shared recipe, then per-family overrides (section 7):
- **Charge-up 80 ms**: the woken unit glows (family colour) and leans 4 px toward the source.
- **Link visual** from source to target: per-kind motif (section 7.5), 250 ms, never plain white.
- **Wake pop** 1.0 → 1.25 → 1.0 (Back.Out, 220 ms) + 5 sparks (10 if charged) + family sound.
- Job tag text ("DEPTH x1.48") stays but uses the `number-pop` preset and rises 30 px.

### 6.6 Chain
- (Today's counter colour behaviour, e.g. white to gold at 8+, is unverified: S2 reads `chainCounter` first and keeps whatever already works.)
- **Chain counter** (`xN`): grows with N (scale step each link), colour ladder 2.7, punch 1.0 → 1.25 → 1.0 per step (120 ms), pitch ladder per link.
- **Banner at x5, x10, x20**: full-width ribbon slides in 200 ms, text with outline + hard shadow, holds 600 ms, exits 200 ms; at x10+ a 6 px shake and a vignette flash; x20 slow-mo 0.6x for 300 ms (visual only).
- Chain end: total damage count-up in the corner (400 ms).

### 6.7 Crate opening
- **Anticipation shake 600-900 ms** (rotation ±4°, growing amplitude, rarity-coloured glow growing), rising pitch.
- **Lid flash**: white full-crate flash 80 ms, lid pops off with a bounce, light burst (rarity colour rays).
- **Items appear 250-400 ms apart**, each on a tile in its rarity colour; rarer = longer pause, bigger pop, louder sound (Legendary: slow-mo 0.5x for 400 ms, gold rays, sparkles).
- Duplicates convert to currency with a visible fly-to-pill.
- **Skippable**: any tap during reveals jumps to the end state (all items shown). The Open button is primary; buttons appear last.

### 6.8 Boss
- **Enter**: **0.5x slow-mo for 500 ms** (visual), vignette in (dark edges, 400 ms), **8-12 px shake** for 300 ms, boss slams in from above with a shadow growing, warning banner "BOSS" slides across.
- **Phase change** (cracked, critical): flash + crack sound + 6 px shake.
- **Attack telegraph**: cell marks pulse (dashed → filled); countdown ring.
- **Defeat**: **hit-stop 100 ms**, then **0.3x slow-mo for 700 ms**, **3-5 explosions** at staggered spots 120 ms apart, final white flash, collapse, parts rain, trophy flies to the shelf. Tap skips to the result.

### 6.9 Win
- Stars pop (4.5), score counts up, reward row flies to pills, **buttons appear last** (after ~1.2 s, fade/scale in). Confetti is limited to 40 pieces, 1.5 s.

### 6.10 Lose
- Calm: desaturate the board to 40% over 400 ms, slow fade of music, a soft thud; "Try again" is primary; no shake, no red flashing. Tone: encouraging text, not punishing.

### 6.11 Tools (Row Surge, Gear Bomb and future)
Each tool gets its own choreography, like Royal Match boosters (TEARDOWN pattern): **token idle** (bobbing, glow ring `#ff4fd8`), **armed** (pulsing, aim preview of the area), **anticipation** 250 ms (zoom 1.03, board dims 20% except the area), **full effect** (Row Surge: a bright bar sweeps the row in 300 ms leaving a scorch trail, every unit in the row wakes in sequence 60 ms apart; Gear Bomb: a gear drops, spins up, bursts in a gear-tooth shockwave ring, teeth fly outward), **aftermath** (scorch decal fading over 2 s), **combo** (two tools: both effects overlap with an extra ring). Max 2 tools on board.

---

## 7. Per-family effect briefs

Every unit gets its own **projectile/pulse shape, impact, and trigger look**, distinct by shape and motion (colours are close for some families). "Shoot" applies to shooters; relays and supports have no shot but may hit the monster, so they get a **pulse** instead.

### 7.1 Shooters: shared rules
- Projectile shape, size 14-34 px, trail style, recoil px, launch flash. Impact: a unique spark **shape** (not only dots), ring or decal, 60-90 ms flash.
- Hook for code: a per-family `ShotSpec` table (new `src/game/fx/shots.ts`) read by `GameScene.shoot`; art sprites for projectiles are optional (procedural first).

### 7.2 Relays: shared rules
- Link motif per edge kind (7.5), a charge-up on the source, a wake on the target. Relays never fire a shot dot; their "hit" on the monster is a small pulse (ring/spark) at the monster in the relay's family colour.

### 7.3 Supports: shared rules
- Supports show an **aura**: a soft ring around their target(s) in family colour, a buff icon floating over the buffed unit, plus a "consumed" pop when the buff is used. Support cards (off-board) animate on the card and highlight the target cell.

### 7.4 One line per unit (39 units): shoot · impact · trigger

Legend: **S** shoot / pulse, **I** impact, **T** trigger. All "none" shots mean the unit has no projectile; its pulse is described instead. Relays DO hit the monster for a small base amount (`docs/ROSTER.md`, e.g. Ladder 8, Capacitor 6, Dynamo 3), so every relay has a family-coloured pulse and impact brief (small, 120-180 ms, 40% of a shooter's impact size, so shooters still read as the damage dealers). Rows that stay "none / —" are supports and off-board cards, which do not hit the monster.

#### Original 13
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Cannon** (red) | S: fat round shell, 34 px, white-hot core, smoke puff trail, recoil 6 px, big muzzle flash | I: round burst + shock ring, 8 orange sparks, soot smudge | T: unit pops with a barrel-kick, brief fuse spark on top |
| **Coil** (cyan) | S: pulse = jagged lightning bolt (zig-zag, 3 forks) hitting the monster | I: electric star with 3 thin arcs, cyan flicker 90 ms | T: lightning arcs to each reached cell (cross shape, up to 2 away), crackle |
| **Bell** (gold) | S: pulse = expanding gold ripple ring from the bell | I: concentric ring on monster + 'ding' glints | T: sound-wave ring travels along the row; each unit shudders as the ring passes |
| **Battery** (green) | S: none; pulse = green charge orb | I: —; buff pop "x1.5" | T: green energy stream into the target shooter, target gets a glowing green ring + bolt badge until used |
| **Fan** (pale blue) | S: none | I: — | T: swirl of 3 curved wind streaks pushes the target one cell; the moved unit slides with motion lines and a puff of dust |
| **Rocket** (orange) | S: pointed rocket, 28 px, flame cone trail + smoke ribbon, launches upward then dives (arc), recoil 3 px | I: big fireball + shock ring + 10 embers, scorch decal 1 s | T: fins flare, a flame burst shoots from the tail |
| **Mortar** (olive) | S: heavy shell on a high **lob** arc (apex 120 px) with a growing ground-shadow marker | I: dirt-and-smoke crater puff, ring flattened (ellipse), 6 debris | T: tube thump, ground-ring at base, deeper chain = larger ring |
| **Fuse Box** (pink) | S: pulse = pink spark zigzag | I: small pink pop + 'zzt' glints | T: diagonal sparks race to the four corners along fuse-like dotted lines, each corner flashes |
| **Magnet** (purple) | S: none | I: — | T: curved field lines pull the target; the target slides with a magnetic ripple; purple "N/S" glints at both ends |
| **Amplifier** (teal) | S: none | I: — | T: concentric broadcast arcs toward the marked unit, which gets a violet boost chevron "x1.3" |
| **Arc Welder** (blue) | S: thin electric arc with white-hot tip hitting the monster, white welding spark shower | I: welding flare (white star, blue halo), 12 tiny sparks falling with gravity | T: bright arc leaps to the strongest touching machine, a molten glow seam appears for 300 ms |
| **Horn** (amber) | S: pulse = conical sound blast (cone, 3 chevrons) | I: cone fades into 3 echo rings | T: vertical blast column up and down its column, units hop 4 px as it passes |
| **Signal Beacon** (red-orange) | S: none | I: — | T: a vertical beam rockets skyward then two pings (red to nearest shooter, orange to nearest relay) arc to targets, with radar rings |

#### Roster B batch 1
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Nail Gun** (steel) | S: rapid **tracer of 3 thin nails** in a straight line, 120 ms, muzzle pops, recoil 3 px, fast stutter shake | I: three small "tick" puncture marks + steel glints | T: row sweep: nails fly along the row; the number of nails equals units in the row |
| **Jackhammer** (yellow) | S: no projectile: the unit **jackhammers down** (3 rapid 5 px bounces) then a **shockwave pulse** rushes along the ground | I: ground-crack lines radiate from the monster base, rubble chips, ignores-shield "zap" flash on the shield | T: rumble: 3 quick vertical jolts on the unit |
| **Gear** (bronze) | S: pulse = a small spinning bronze cog rolls from the gear to the monster (no arc), 16 px | I: cog-tooth ring stamp + 4 bronze tooth chips | T: both gears spin up (rotating, teeth glints) and a **chain of tiny gears** draws between them; the far Gear locks in with a click |
| **Saw Blade** (silver) | S: **spinning circular disc**, 26 px, rotating, shaving sparks trail, flies in a flat line | I: disc bites in, a **line slash** mark + spark fan, disc returns 150 ms | T: the blade spins up (3 rotations) before waking; edge units glint |

#### Roster B batch 2
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Wrench** (tan, card) | S: none (off-board) | I: — | T: card glows; a wrench icon "tightens" (rotates 45° with a click) and a +1 RANK chevron lands on the next merge |
| **Piston** (rust-red) | S: **piston punch**: a pressure puff leaves the cylinder then a compressed-air ring travels straight | I: dent-shaped flat ring + dust puff, bigger with more empty neighbour cells | T: unit pumps (stretches 1.1 vertical, snaps back), steam puffs from the open sides into empty cells |
| **Spring** (green) | S: pulse = a green coil-shaped ripple that boings to the monster in one short hop | I: squashed green zig-zag ring + 3 bounce dots | T: unit **coils and boings**: a green dotted arc **hops over** the next part to land on the one after; landing squash |
| **Belt Drive** (slate) | S: pulse = a short slate dash-band (3 marching dashes) sliding along the line to the monster | I: flat slate streak + 3 rubber-black scuff chips | T: a **moving belt line** (dashes marching) runs from the unit along the row to the far end, rollers spin |

#### Roster B batch 3
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Blowtorch** (orange) | S: **flame cone** (not a ball): a short jet 90 px that flickers, blue core + orange tip | I: scorch mark + flame lick on the monster; burned hazards in the column char and crumble to ash | T: pilot light flares blue, a flame tongue runs up the column |
| **Pipe** (grey-green) | S: pulse = a grey-green water-droplet jet that spurts out of the open pipe end | I: splash crown + 4 droplets, brief wet-dark patch | T: a **pipe tube** (rounded, with water-gurgle ripples) connects to touching parts, then to same-kind parts; pressure puff at each joint |
| **Blast Plate** (steel-lilac, card) | S: none | I: — | T: card shows a hex shield; tapped cell gets a **blue-grey dome** shield pulse; on block, a "clang" flash and spark ring |
| **Tesla Tower** (ice cyan) | S: **big forked lightning** from a coil-top orb, 3 branches, thick white core + cyan halo; extra bolts per charge | I: ground-hit crackle web + cyan flash + screen-edge flicker 60 ms | T: the tower's orb **charges** (growing glow, small orbiting sparks) as each relay fires, +1 spark per charge |

#### Roster B batch 4
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Capacitor** (teal-blue) | S: pulse = a teal-blue energy orb thrown in a soft arc (bigger the longer it held a charge) | I: teal flash disc + 2 expanding rings, tiny static crackles | T: absorbs: a bright orb slowly **fills** the unit (glow meter), holds with a faint hum, releases next merge as a burst to one neighbour |
| **Blueprint** (blue, card) | S: none | I: — | T: card unrolls a **white-line grid** of the next 3 deliveries; chosen cell gets a blueprint-blue ghost outline and "COPY" stamp |
| **Ladder** (brown-gold) | S: pulse = three small gold rung-bars that fly up in a staircase to the monster, each one higher | I: stacked rung marks climbing the monster (1, 2, 3 chips) + gold glints | T: **rungs light up in sequence** (1, 2, 3 …) climbing from unit to unit; each step brightens and pitches up |
| **Rewind Crank** (lilac, card) | S: none | I: — | T: card **crank spins backward**; the board plays a quick reverse ghost trail (violet afterimages) as it rewinds |

#### Roster B batch 5
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Wrecking Ball** (dark steel) | S: a **swinging iron ball** on a chain: arc swing from the unit, chain drawn as a line, **heavy** (no trail, motion smear) | I: big **shockwave** + dent decal + debris, screen shake 4 px scaled by distance | T: chain tightens and the ball swings back and forth once |
| **Crane** (yellow) | S: pulse = a yellow hook-and-line drops from above onto the monster and lifts away | I: yellow "thunk" ring + hazard-stripe chips, small dust puff | T: a **hook drops from above**, grabs the part, lifts it over (shadow below), sets it on its twin with a thunk, merge flash |
| **Dynamo** (magenta) | S: pulse = a spinning magenta ring (halo) that spirals to the monster | I: orbiting-spark ring that spins once + magenta flash | T: a **spinning ring** of energy around the 2x2 block, magenta sparks orbit, then bursts outward to the ring cells |

#### Roster B batch 6
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Robot Arm** (blue) | S: arm extends and **swings a claw** at the monster (no projectile); claw tip takes the copied relay's colour | I: claw-slap (impact star in the copied relay's colour) + dented decal | T: **ghost silhouette of the copied relay** flickers on the arm, then the copied relay's own trigger plays from the arm |
| **Tilt Lever** (orange, card) | S: none | I: — | T: whole board **tilts** 3° toward the pulled edge with a creak; parts slide with dust trails; twins that meet get a merge pop |

#### Roster B batch 7
| Unit | Shoot (S) | Impact (I) | Trigger (T) |
|---|---|---|---|
| **Rivet Gun** (amber) | S: single **chunky rivet**, 18 px, hot-orange tip, pop + smoke ring at muzzle, sharper than nail | I: rivet **embeds** (stays stuck 400 ms) with a glowing ring; a "x2" gold flash if it was 3rd | T: 3-count pip row above the unit lights as the chain count passes (1, 2, 3 = x2) |
| **Vice** (grey) | S: pulse = a grey clamp-shaped pulse (two short bars closing) snapping at the monster | I: pinch-mark "><" decal + steel glints | T: Vice only works on a **board edge**: it wakes the next **3 cells inward in a straight line** (nothing off the edge). A grey clamp-pulse travels inward along that line, each of the 3 cells squeezes 0.95 as it passes with a spark at contact; woken shooters gain a steel outline glow. An off-edge Vice shows a "needs an edge" shake, no effect |
| **Router** (green-teal) | S: pulse = a green-teal dot that follows a right-angle (L) path to the monster | I: L-shaped corner flash + 2 chevron glints | T: an **L-shaped path** (rounded corner) draws with arrow-chevrons, light dot runs along it, junction flashes at the turn |
| **Hydraulic Press** (blue) | S: a **flat plate stamping down**: the press head slams (squash unit 0.8), a flat shockwave **disc** expands | I: stamped square footprint decal, ring flattened, metal clang flash; strongest when all 4 neighbours are full | T: pressure gauge needle swings up on the unit; steam vents at the sides |
| **Lathe** (olive-gold) | S: a **spinning thread of wood-chip shavings** in a straight ribbon from edge to edge, curly shavings trail | I: spiral cut mark + shaving curls pop, ring spins once | T: chuck spins fast (rotation blur) before waking, shavings fly |

### 7.5 Link motifs per edge kind (fixes "roster B links draw WHITE")
Every edge kind must have a colour (family colour of the source) AND a motif. The list below is the full `edges[].kind` union in `src/core/types.ts` (27 kinds); the S3 test must check it against the type so a new kind cannot ship without a motif.
- Original: **coil**: jagged bolt · **bell**: ring wave · **horn**: cone/column blast · **fuse_box**: dotted diagonal sparks · **magnet**: curved field lines · **fan**: wind streaks · **battery**: energy stream · **arc**: arc lightning · **amp**: broadcast arcs.
- Core-generated kinds: **spark**: short bright zig-zag in the source family colour (the default chain link; also Signal Beacon pings) · **backfire**: a red-orange recoil jolt that snaps back toward the source with a puff (a failed or reversed link) · **bridge** (Belt Drive; the code kind is `bridge`, not "belt"): marching dashes jumping over the skipped cells · **chime**: a small bell-note ripple with 2 musical glints · **item** (power-up item wake): an item-coloured streak with a bolt/corner glyph at the target · **ring** (Dynamo block wake): a closed ring of sparks around the block · **copy** (Robot Arm / Blueprint): a ghost outline of the source slides to the target with a "COPY" tick.
- Roster B: **gear**: tiny gear chain · **hop** (Spring): dotted parabola · **belt**: marching dashes (same motif as bridge but continuous along every cell, not skipping) · **pipe**: tube with ripples · **cap**: filling orb then burst · **stair**: lit rungs · **vice**: clamp pulse inward along the 3-cell line · **router**: L path with chevrons · **lift** (Crane): hook line from above · **swing** (Wrecking Ball): chain line + arc.
- Rule: each kind has its own colour entry (source family colour) in `linkMotifs.ts`; a fallback to white is a bug.

---

## 8. Home screen layout

Pattern from Clash Royale / Brawl Stars / Royal Match (TEARDOWN): **our own machine/board as the showcase**, one huge Play, a crate row with timers, a thin daily strip, a bottom nav.

Top to bottom (720 x ~1280):
1. **Top bar** (height ~88): left = profile/level chip; centre = currency pills (bolts, gems/scrap) with count-up; right = settings icon. Notification dots on icons.
2. **Chapter strip** (thin, 56): chapter name + progress pips; tap opens the road.
3. **Hero showcase** (~420, the visual centre): the player's current machine (chosen family `hm_*` with `hero_chassis_*` finish) on a warm bench with soft light shafts, floating specks, idle animation (breathing, occasional spark). A small "roster preview" row of 3-4 squad units under it (deck preview).
4. **PLAY** (primary, 96 high, ~80% width, centred, in the thumb zone): "PLAY  LEVEL N", yellow, breathing + shine sweep. Boss level: red-tinged with a skull-gear icon. The only big button on the screen.
5. **Crate row** (~130): 3-4 crate slots, each a crate icon with a timer chip or "READY" gold glow; tap opens the crate screen. Locked slots show a padlock.
6. **Daily strip** (thin, 64): daily bounty / free reward, progress pips; red dot when claimable.
7. **Bottom nav** (~110): 4-5 tabs: Road, Machine, Units, Crates/Shop, Events. Active tab raised.

Rules: **at most 2 equal-weight actions** on screen (Play + the crate row); the UI auto-guides new players to the right place (pulse the Play button and a hand pointer on first launch); no more than ~7 tappable things in the top 70%. Background has depth: vignette, 12-20 floating specks drifting slowly, a soft light shaft.

---

## 9. Other screens (spec in one line each)

- **Road/map**: nodes by state (normal, hard, boss, completed with stars, locked, current pulsing); path in cream; chapter header ribbon.
- **Units / roster**: grid of rarity-framed cards, glyph tile fallback until art; detail popup with rank ladder, job text, and an effect preview strip (S3).
- **Machine tab**: showcase + finish picker; **Events tab**: cards with timers, not text rows.
- **Crates**: big crate, rarity glow, anticipation (6.7); odds row below, never overlapping; clean glyph tiles for units without art.
- **Results**: stars (4.5), count-ups, reward row, buttons last (6.9); lose = calm (6.10).
- **Settings/pause**: ribbon section headers, toggles/sliders (4.7), nothing under 22 px.
- **Screw Yard**: same enamel look: painted plates (wood/metal/plastic), neutral grey screws with coloured heads, boxes with lid + latch; finished box gets a clear completion moment (latch, shake, pop, fly to reward).
- **Tutorial/coach**: hand pointer, spotlight mask, NEXT strip, hint glow on valid merges.

---

## 10. Asset naming and folder rules

Existing keys are **never renamed** (the game, artPlan regexes and tests depend on them). New keys follow the same prefix-first pattern the repo already uses.

- Files: `src/assets/art/<key>.webp`, lowercase, `a-z 0-9 _` only, no spaces. The key IS the file name (Phaser texture key). Import with `node tools/import-art.mjs <folder>` after adding a `keyFor` rule. (Docs and tools say PNG; the shipped files are WebP; the importer writes PNG and the code accepts both. See 13.)
- Pattern: `<prefix>_<name>[_<state>|_<rank>]`. Ranks `_1.._8`. States: `idle press disabled hit attack dead locked glow open`.
- Prefixes (extend, do not fork): units `<family>_<rank>` (existing), `hm_<family>_<n>` (home machine), `job_<family>` (glyph), `boss_<id>_<state>`, `mon_<name>[_dmg]`, `btn_<role>[_pressed]`, `ui_<thing>`, `crate_<tier>[_open]`, `sy_*` (Screw Yard), `oy_*` (Object Yard), `vfx_<name>`, `proj_<family>` (projectile), `hit_<family>` (impact), `tool_<id>_<state>`, `bg_*`/`stage_*`, `icon_<name>`, `badge_<name>`, `banner_<name>`, `coach_*`, `notif_*`.
- Audio (when files ever exist): `sfx_<thing>_<variant>`, `mus_<mode>`. Until then everything stays synth in `audio.ts`.
- Sources: ChatGPT originals and batches go to `art-candidates/<topic>/` (never shipped); only the processed WebP goes to `src/assets/art/`. Keep the prompt text in the registry `source.prompt` (Asset Hub).
- Every new key needs: an `artPlan.ts` classification (so it does not leak into the eager set) and, once the registry exists, an `assetRegistry.ts` entry.
- Code modules: UI kit in `src/game/ui/kit/<component>.ts`; effects in `src/game/fx/<thing>.ts`; text styles in `src/game/ui/textStyles.ts`; motion presets in `src/game/fx/motion.ts`. `GameScene.ts` is a merge-conflict hotspot: **only one-line delegating methods**, never logic.

---

## 11. Quality bar checklists

A task is not done until every box for its asset type is true, with a screenshot.

**Unit art (per rank sprite)**
- [ ] 256x256 source, transparent background, WebP, < 40 KB.
- [ ] Reads at 60 px (tray) and 118 px (cell); silhouette distinct from every other unit of the same role.
- [ ] Dark *tinted* outline, light top-left, cream base plate, brass trim from rank 3, glow/crown at 5-6.
- [ ] Each rank visibly different in silhouette, not only a number.
- [ ] Family colour (2.5) is dominant.
- [ ] Side by side with `cannon_4` and `coil_3`, it looks like the same artist.

**UI kit piece**
- [ ] One corner radius family, 9-slice safe (no detail in the stretch zone).
- [ ] Light top-left; lip + gloss present; outline = darker tint of face, never black.
- [ ] States complete (idle, press, disabled).
- [ ] Text is live, not baked; contrast against face >= 4.5:1.
- [ ] Touch target >= 56 px for anything tappable. Visual size may be smaller if the hit area is padded to 56 (the 96x48 toggle gets a 96x56 hit area; the 22 px notification dot is not tappable, it decorates a 56+ px icon button).

**Icon**
- [ ] Same outline weight and painted style as the set; 64x64 minimum authoring size, readable at 32 px.
- [ ] Single concept, no text.

**Effect (code)**
- [ ] Matches the timings in section 6 (within ±20%).
- [ ] Distinct from every other family in shape and motion (section 7.4), not just colour.
- [ ] Uses pooled objects; respects the effect budget; no allocation per frame.
- [ ] Does not pause or alter the simulation (determinism tests still pass); preview never mutates state.
- [ ] Shake respects the setting; skippable if longer than 1 s.
- [ ] Holds 60 fps on a mid phone in a 20-chain board (measure, state the device).

**Background / screen**
- [ ] Has depth (vignette or layers), warm light from the top-left, nothing important in the top 100 px behind the header.
- [ ] Authored at >= 2x display size (no up-scaled 405x720 for a 720-wide screen).

**Sound**
- [ ] Per-family voice distinct; ±5-8% pitch variation; rising ladder on chains; no clipping; muted correctly by the setting.

**Everything**
- [ ] Added to `artPlan.ts` classification and (once it exists) the registry.
- [ ] Before/after screenshot attached.
- [ ] `npm run typecheck`, `npm test`, `npm run build` pass.

---

## 12. Technical constraints (from AUDIT section 5)

- Current: 463 WebP files, 15 MB; 72 code-drawn textures; every key is its own `load.image`; art is cached forever by `public/sw.js`.
- Budget: **+5 MB lazy art is fine; nothing new in the eager set** (BOARD/HOME regexes). 22 units x 6 ranks adds ~3 MB download and ~35 MB GPU.
- Authoring: 256 px for units (display ~118), 2x everything else. Backgrounds >= 1440 px wide for full-screen use.
- Phaser 3.90 postFX (glow, shine, vignette) cost an extra render pass each: use on single sprites only, never full-screen, and offer a "low effects" fallback.
- Effect budget: <= 12 live damage numbers, <= 80 particles; pool everything.
- All randomness in the **model** uses the saved seeded Rng; presentation may use `Math.random` for visual jitter only (never feeds back into state).
- Fonts: bundled via @fontsource; adding the body font adds ~30-60 KB.

---

## 13. Execution plan (ordered slices)

Order = value per effort. S1-S4 and S7-S10 need no new art (they use procedural stand-ins; S5 later swaps in painted art). Each slice is a task for one worker, in one branch, with its own acceptance and verify steps. **Always:** `npm run typecheck`, `npm test` and `npm run build` pass; minimal `GameScene.ts` edits (one-line delegations); each new component in its own new file; before/after screenshots via `tools/shots.mjs`.

### S1 - UI kit v0 in code (size M-L, 2-3 days)
Goal: the game *feels* tactile, with no new art.
- **Files (all new)**: `src/game/fx/motion.ts` (press, popIn, popOut, breathe, shineSweep, countUp, flyToPill, hitFlash, squash, slowmo, hitStop presets), `src/game/ui/kit/button.ts` (squish + release overshoot 1.04→1.0/140 ms, primary breathe + shine sweep, disabled + reason), `src/game/ui/kit/popup.ts` (dim 60%, scale 0.8→1 back-out 250 ms, exit 150 ms, tap-outside), `src/game/ui/kit/bar.ts` (rounded caps, gloss, shine sweep, lag bar, <30% red, <20% pulse), `src/game/ui/kit/stars.ts` (star pop extraction), `src/game/ui/kit/currency.ts` (count-up 400-600 ms, fly-to-pill staggered, pill bounce), `src/game/ui/kit/bake.ts` (baked gradient + lip + gloss textures via `bakeTexture`), `src/game/ui/textStyles.ts` (section 3 presets).
- **Edits**: `GameScene.button()` and `panel()` become one-line delegations; `hud.ts` HP bar uses the new bar; `results.ts` uses stars/currency.
- **Acceptance**: every button in the game squishes and overshoots; all popups ease in/out; the HP bar has gloss, a lag trail, red below 30% and a pulse below 20%; gaining currency counts up and coins fly to the pill with a bounce; primary buttons breathe; disabled buttons show a reason; core/determinism tests unchanged and passing; new unit tests for motion helpers (durations, end values) and the lag bar logic.
- **Verify**: `npm run typecheck`; `npm test`; `npm run build`; `npx vite-node tools/sim.ts` unchanged; `node tools/shots.mjs` before/after of home, results, HUD; a note of fps on the reference phone.

### S2 - Hit and shoot juice shared layer (size M, 2 days)
- **Files**: `src/game/fx/hitReact.ts` (white flash 60-90 ms, squash 1.15x0.85/120 ms, knockback 3-6 px, scaled by chain), `src/game/fx/damageNumbers.ts` (rise 40-60 px/650 ms, jitter, crit ramp, effect budget), `src/game/fx/shotRecipe.ts` (muzzle flash 60-80 ms, recoil 4-6 px, trail 6-10 segments, pitch ±5-8%), `src/game/fx/mergeFx.ts` (pull-in 80 ms, flash, ring, 12-20 sparkles by rank, pop 0→1.3→1.0/260 ms), `src/game/fx/chainCounter.ts` extension (colour ladder 2.7, banner at x5/x10), kill/boss slow-mo helpers.
- **Edits**: `hitTarget`, `shoot`, `commitDrop`, `floatText` call the new modules (one-line delegations).
- **Acceptance**: hit reaction visible at arm's length on a phone; damage numbers jitter and never overlap into a blob (budget test); merges show layered effect scaled by rank; chain counter changes colour at x5/x8/x12; boss defeat has hit-stop + slow-mo and is skippable; sim unaffected.
- **Verify**: typecheck, test, build; add a test that effects do not touch model state (events in, no state mutation); screenshots/strips via `tools/shots.mjs`.

### S3 - Per-unit effect families (size L, 3-5 days; split into 2-3 PRs)
- **Files**: `src/game/fx/shots.ts` (ShotSpec table keyed by family: shape, size, trail, recoil, flash, impact, from section 7.4), `src/game/fx/linkMotifs.ts` (edge kind → colour + motif, fixes WHITE links, section 7.5), `src/game/fx/triggerFx.ts` (per-family charge-up and wake), `src/game/fx/auras.ts` (support auras/buff badges), `src/game/fx/families/*.ts` for the complex ones (Tesla, Wrecking Ball, Crane, Robot Arm, Tilt Lever, Router, Ladder, Capacitor).
- **Acceptance**: all 39 units have a distinct shoot/pulse + impact + trigger (checklist in 11, table in 7.4); no edge kind draws white; the 15 shooters are distinguishable with the sound off and colour desaturated; effect budget respected on a 20-chain; QA panel gets a "preview unit FX" switch (one `qaSwitch` entry in `QA_ROWS`) that fires each unit's three effects.
- **Verify**: typecheck, test, build; a new test that every unit id has a ShotSpec / link motif; the preview switch recorded as strips in `art-candidates/unit-fx/`.

### S4 - Home screen (size M-L, 2-3 days)
- **Files**: `src/game/ui/home/showcase.ts`, `home/playButton.ts`, `home/crateRow.ts` (timers, READY glow), `home/dailyStrip.ts`, `home/nav.ts`, `src/game/fx/ambience.ts` (vignette, specks, light shaft); wired into the road/home tab module.
- **Acceptance**: layout of section 8 at 390x844 and 430x932; one dominant Play; crate row shows timers and a READY glow; no more than 2 equal-weight actions; specks/vignette run < 1 ms/frame; first-launch hint on Play.
- **Verify**: typecheck, test, build; shots of home at two aspect ratios; fps note.

### S5 - New art through ChatGPT (size L, 1-2 weeks, **BLOCKED**: the owner's Chrome ChatGPT tabs are frozen)
- Batches in the style of the "Create Tray Asset" chat, in this order: (1) 9-slice UI kit (panel, ribbon, 6 pill colours + pressed/disabled, tab, toggle, slider, toast, currency pill); (2) the 22 units x 6 ranks, Common/Rare first; (3) crates (use `art-candidates/roster-b1`) and Screw Yard set (plates, boxes, neutral grey screw); (4) home showcase set + icons set; (5) tool art (Row Surge, Gear Bomb); (6) optional projectile/impact sprites.
- **Acceptance**: each batch passes the section 11 checklist; imported with `tools/import-art.mjs` (+ `keyFor` rules); `artPlan.ts` and its test updated; size within the section 12 budget; owner approves in the Asset Hub or chat.
- **Verify**: typecheck, test, build; `tests/artPlan.test.ts`; GPU/download numbers reported.
- Unblock path: when ChatGPT tabs are available again; until then S1-S4 + S6 proceed, and the glyph-tile fallback is made to look intentional (part of S1/S3).

### S6 - Asset Hub v0 (size M, 1-2 days)
As specified in `ASSET_HUB_DESIGN.md` "First slice": `src/content/assetRegistry.ts`, `tests/assetRegistry.test.ts`, `tools/build-asset-hub.mjs`, `tools/capture-code-assets.mjs`, phone page with categories, previews, status badges, search, needs-art list and the "x of y final" meter. Acceptance and verify commands are in that doc. Can run in parallel with S1-S4 (no overlap in files).

### S7 - Crate opening choreography (size M, 2 days; code, uses glyph tiles until S5 art)
- **Files (new)**: `src/game/ui/crates/openSequence.ts` (anticipation shake 600-900 ms, lid flash, rarity-coloured reveals 250-400 ms apart, legendary slow-mo, duplicate fly-to-pill, skip-on-tap, buttons last), `src/game/ui/crates/rarityGlow.ts`, `src/game/ui/crates/glyphTile.ts` (intentional-looking tile for units without art). Edit: crate screen module delegates (one line).
- **Acceptance**: section 6.7 holds; big crate (no tiny bag in an empty panel); odds row never overlaps; any tap during reveals jumps to the end state with all items shown; no endless tweens after skip/close (existing `crateLeak` test still passes); sim unaffected.
- **Verify**: typecheck, test, build; shots of the open sequence at 3 moments (shake, reveal, end) at 390x844.

### S8 - Boss, win and lose moments (size M, 2 days; code)
- **Files (new)**: `src/game/fx/bossIntro.ts` (0.5x visual slow-mo 500 ms, vignette, 8-12 px shake, BOSS banner), `src/game/fx/bossDefeat.ts` (hit-stop 100 ms, 0.3x slow-mo 700 ms, 3-5 staggered explosions, skip on tap), `src/game/ui/resultsFlow.ts` (6.9 win order: stars, count-up, rewards fly, buttons last; 6.10 lose: desaturate 40%, calm, no shake), plus the Screw Yard completion moment `src/game/ui/screwYardDone.ts` (latch, shake, pop, fly to reward; the "finished box just disappears" bug).
- **Acceptance**: sections 6.8, 6.9, 6.10 and the Screw Yard line in 9 hold; slow-mo and hit-stop are visual only (model tick unchanged: core and determinism tests unchanged and passing); every sequence over 1 s is skippable; shake respects the setting and is max, not sum.
- **Verify**: typecheck, test, build; `npx vite-node tools/sim.ts` unchanged; shots/strips of boss in, boss out, win, lose, Screw Yard box done.

### S9 - Tool choreography: Row Surge and Gear Bomb (size M, 2 days; code, art optional)
- **Files (new)**: `src/game/fx/tools/rowSurge.ts`, `src/game/fx/tools/gearBomb.ts`, `src/game/fx/tools/combo.ts`, `src/game/fx/tools/toolToken.ts` (idle bob, armed pulse, aim preview), registered through the existing tool events; scorch decal in `fx/ambience.ts`. This is the code slice that consumes the S5 batch-5 tool art; procedural shapes first.
- **Acceptance**: section 6.11 holds for each tool (idle, armed, anticipation 250 ms, full effect, aftermath, combo); max 2 tools on board; tools stay off in puzzles/daily/bounties as today (QA flag unchanged); effects stay inside the budget in section 6; sim unaffected.
- **Verify**: typecheck, test, build; tests that tool effects only read events; strips in `art-candidates/tool-fx/`.

### S10 - Screens, menus and sound (size L, 3-4 days; split into 2 PRs)
- **Files (new)**: `src/game/ui/kit/listRow.ts`, `kit/settingsRow.ts`, `kit/segmented.ts` (4.12), `kit/tabs.ts` and `kit/toast.ts` (4.9, 4.10), icon wiring `src/game/ui/icons.ts` (4.11, procedural stand-ins until S5), reskin of the section 9 screens (road, units, machine, events, settings, pause, results, Screw Yard) in the existing `src/game/ui/*` modules via the kit; `src/game/audio/voices.ts` extension: per-family voices, chain pitch ladder, star/coin ticks, crate/boss stingers (synth, no files).
- **Acceptance**: every screen in section 9 uses kit components only (no raw rounded rects with ink outline); nothing under 22 px; per-family sounds are distinct with ±5-8% pitch; pitch ladder rises on chains; sound respects the mute settings.
- **Verify**: typecheck, test, build; shots of each screen at 390x844 and 430x932; a list of any screen still on the old look.

### Slice dependencies
S1 → S2 (shared motion presets) → S3. S4, S7, S8, S9 and S10 need S1; S8 and S9 also need S2 (hit-stop/slow-mo helpers). S5 independent but blocked (its art is consumed by S4, S7, S9, S10). S6 independent.

---

## 14. Open questions and follow-ups

1. **PNG vs WebP wording**: `CLAUDE.md` line 12 ("drop PNGs into `src/assets/art/<key>.png`") and `README.md` lines 138 and 186 say PNG, while all 463 shipped files are WebP (the importer writes PNG and the loader accepts both). Not changed here (this task touches `docs/art/` only). **Follow-up**: reword to "drop PNG or WebP; shipped files are WebP" in those three places.
2. Body font: Nunito (proposed) vs another rounded face: owner or Lead to confirm before S1 bakes the text styles.
3. Home hero: current machine only, or a rotating gallery of all owned machines?
4. Do tools (Row Surge, Gear Bomb) get their own colour (magenta `#ff4fd8` is the "power-up" mark colour) or one colour per tool?
5. Screw Yard: keep the old look as default until the painted set lands (agreed, behind the QA switch).
6. Palette hexes marked [art] are quantised samples: S5 should re-sample from the final ChatGPT batches and update section 2.
7. Per-unit briefs in 7.4 are written from `FAMILY_INFO` and the audit's tags, not from playing each unit: a designer pass on jobs that changed recently is welcome.
8. **Owner to know**: the brief said "39 new units"; the code has **39 units in total** (13 original + 26 roster B). Section 7.4 covers all 39. If the owner means 39 on top of the 13 originals, the roster needs 13 more units: tell the owner and ask.
9. Rank wording: playable cap is rank 6 (README); art files to rank 8 exist for some units and are ignored.
10. Claims about today's behaviour marked "unverified" in 3, 4.4, 6.2 and 6.6 (popup slide, digit width, squash, chain colour) must be checked by the S1/S2 worker before they are replaced.
11. Radius rule (section 1 rule 5) and touch-target padding (section 11) are proposals; confirm with the first baked kit.
