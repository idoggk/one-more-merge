# Ordinary cast and chapter stages — v20

## Integration

Apply CAST_CONFIG.json as a visual patch, not a replacement level specification. Keep mechanical monster ID, HP, deterministic RNG consumption, goals, behaviour, modifiers, timing, kickback rules and rewards unchanged. No re-calibration is required solely for this art patch.

Render the actual new display name. Preserve established shield/suction/frost overlays and warning icons. The card describes the inherited behaviour. A visual character can carry that behaviour; do not infer a new power from its household object. L11 remains Mad Fridge for the shield lesson.

Each pair uses one scale and translation derived from pair_union_bounds, with foot_anchor_pixels aligned to stage x=50%, y=88%. Fit the UNION of both states within 78% stage width and 80% stage height; do not independently normalize states. Bounds and anchors are measured render guides, not an animation rig. Damaged texture starts at HP <=50%, only once per encounter, with a 100ms crossfade. Do not attach old face patches to these new faces.

Backdrops are opaque, wide, near 16:7. Use cover in the existing stage panel and keep the centre visible. Existing stage wash is fine; do not tint the monsters. All six stages also apply to the chapter mini-boss and chapter boss. Chapter palette values are road-strip fills and accents only: retain red warnings, gold goals and cream text plates.

No new intro lesson, unlock card, currency, attack or tutorial for these cosmetic characters. Reuse existing entry banner at its existing timing.

## Level replacements

| Chapter | Character | Personality | Levels |
|---|---|---|---|
| 1 | Kettle Grump | Boils over at everything. | 4, 7 |
| 1 | Colander Clatter | Hides nervously behind its handles. | 6, 9 |
| 2 | Sock Cyclops | Convinced it ate your missing sock. | 12, 14, 17 |
| 2 | Iron Duchess | Considers wrinkles a personal insult. | 16, 19 |
| 3 | Toolbox Terrier | A scrappy dog made from a toolbox. | 21, 24, 27 |
| 3 | Traffic Cone Goblin | Directs traffic that does not exist. | 22, 26, 29 |
| 4 | Pixel Pug | Takes losing badly on its pixel face. | 31, 34, 37 |
| 4 | Joystick Jester | Celebrates before it wins. | 32, 36, 39 |
| 5 | Gramophone Goose | Has terrible volume control. | 41, 44, 47 |
| 5 | Accordion Imp | Wheezes with theatrical indignation. | 42, 46, 49 |
| 6 | Wheelie Warthog | Charges on one squeaky wheel. | 51, 54, 57 |
| 6 | Satellite Scuttler | Always searching for a signal. | 52, 56, 59 |

Old cast remains on L1-3 and L5 in chapter 1; L11/L13/L15 in chapter 2; positions 3 and 5 in chapters 3-6. Thus 33 ordinary encounters use the new cast and 15 retain familiar cast; 6 mini-bosses plus 6 chapter bosses make 60 levels. The reported 54 ordinary levels includes the six mini-boss slots: there are now 48 ordinary encounters.

## Optional tiny idle accents

Use existing whole-sprite idle sway; do not add extra animation layers or particle clutter. Pixel Pug may dim its screen glow by 6% for 100ms every 3.5s; Gramophone Goose may lean 0.8 degrees over 2200ms; all other characters can keep the existing 0.5-degree sway. Disable cosmetic motion while hit feedback plays.
