# Round 24 — temporary attachments

Proposal for Claude's live engine. Not simulated in this workspace. Recalibrate affected levels and goal-aware policies after implementation. Three items, one tray slot, no new resource.

## Drops

Introduced at L13. On configured defeat levels, replace the first 50%-HP threshold's ordinary kickback part with one item. Other 75/25% kickbacks unchanged. Maximum one item per level, including bosses. No triggers from MAX HIT, phase armor breaks, passive hits or extra chains. A passive shot can cross the ordinary 50% threshold; it still follows the one-shot milestone rule rather than granting a separate passive reward.

Plan after full cascade and milestone resolution, using post-cascade board. If the monster is dead, cancel item presentation; milestone is settled once, with no part fallback or resource compensation. Visual capsule flight never owns settlement authority.

Use a dedicated deterministic item RNG stream, never delivery RNG. First teaching encounter prescribes type. Otherwise uniform among unlocked types having a compatible unbuffed machine on the post-cascade board. Eligibility uses family, not rank or damage. If none qualify, retain ordinary kickback instead. Item selection is committed once; no reroll if the machine later leaves. Pending/in-flight item already owns the single tray slot.

Goal levels have no HP thresholds. They receive no automatic item unless configured explicitly. Teaching L16 grants SPARK once at 8s, after current cascade; if already won, no grant. If cleared before the first-teach grant/application, defer that prescribed first-teach item to the next eligible normal level and use its one allowed item grant; never introduce it unexpectedly on a boss. Persist seen/unlocked only after actual teaching application. Do not invent a fallback boss HP bar.

## Types

OVERCHARGE: Cannon/Rocket only. Next two activations in player-rooted merge cascades multiply ordinary chain-shot damage by 1.5. One BFS activation and shot event, cosmetic double pulse only. Passive damage neither benefits nor consumes. Shooter's other native effects unchanged.

SPARK: Cannon/Rocket only. Next activation in player-rooted merge cascade adds wake edges to occupied U,R,D,L neighbours, excluding source's own family. Emit after ordinary shot/native effects. Ordinary queued/activated-ID dedup, no second traversal.

CORNER KIT: Bell only. Next activation in player-rooted merge cascade adds wake edges to occupied UL,UR,DL,DR neighbours, excluding Bells. Union/deduplicate against native effects/signatures. Existing edges retain order; appended unique item edges use stated order.

No attachment benefit or consumption in passive or automatically rooted kickback cascades. Existing engine attribution should mark root cause explicitly rather than infer from animation. Item-generated downstream activations belong to the same player-rooted cascade.

Each owner has one attachment and integer charges. No wall-clock expiry, stacking, replacement or helpers as recipients. Freeze attachment snapshot at cascade start, apply and consume at owner's activation even if boss modifier blocks benefit or damage cap truncates it. Newly queued targets follow normal once-per-ID behaviour. No rank changes, auto-merge, supply creation, revival or reactivation.

## Bosses and cap

HOT COLUMN x0.5 combines multiplicatively with OVERCHARGE x1.5; shield and existing bonuses follow existing arithmetic. REST ROW suppresses Bell item edges. SPLIT suppresses any crossing item wake edge, including shooter SPARK; implement a shared wake-edge predicate rather than source-family-only checks. No geometric ray requirement for adjacent item edges beyond existing cell eligibility and boss crossing restriction.

CLAMP does not prevent an attached resident's cascade activation. FROST restricts receiving/moving into row, not normal resident activation. SUCTION removes piece and attachment together.

Aggregate all final cascade damage, then existing 35%-max-HP MAX HIT cap once. Never give overflow/uncapped second shot. Charges consume normally. Goal levels without finite HP do not use MAX HIT damage cap, but retain bounded BFS. Chain goals count actual unique activated IDs, including item wakes; rank goals require player merge result as usual.

## Merge and movement — final rule superseding initial chat suggestion

Never reject an otherwise legal matching merge due to attachments. Neither attached: ordinary merge. Exactly one attached: resulting ID inherits attachment and remaining charges regardless of destination. Both attached: destination's attachment/charges survive, source's expire without refund; never combine charges. Apply same destination rule to kickback fuse. Transfer before merge-root BFS snapshot, so a player merge can immediately consume an inherited charge. Automated fuse transfers but its automatic-rooted cascade does not consume/use the attachment.

Move preserves attachment. Scrap/suction destroys it. No inventory refund. Merge ghost must preview surviving attachment; while holding an attached source over an attached destination, a small source badge fades out in preview to show loss. No blocking dialog.

## Input and visuals

One 44x44px tray slot between NEXT and SCRAP; at least 48px hit target. Hide before introduction. Adapt layout at 320px, keeping existing controls >=44px; do not cover board. Pending capsule arc 420ms then reveal item. Drag onto compatible unbuffed machine or tap item then tap machine. Valid targets 2px item rim; invalid sprites 55% opacity while selecting. Release invalid returns 140ms cubic-out, no consumption. Target current ID/family/unbuffed eligibility rechecked at commit between cascades. No delayed auto-attach to a changed ID. Pointer cancel deselects without loss.

Item stays until level ends if ignored; no auto-use/expiry/compensation/carryover. Apply pulse 180ms. Owner badge 16px upper-left away from rank plate, two code-rendered pips for OVERCHARGE then one. Consumption badge flash 120ms then remove at zero. No constant cell-wide aura; extra reach shown only on inspection/held preview with item color at 35% opacity. Preserve rank and family readability.

Error copy: Use on a Cannon or Rocket. / Use on a Bell. Occupied attachment error: This machine already has an attachment.

## Teaching

L13 OVERCHARGE, shield already familiar. Pause once after capsule landing. Highlight item plus shooter: Put this on a shooter. Its next two chain shots hit harder. Resume only after valid application; next real chain shows charge consumption. L16 SPARK goal relief level explicit 8s grant: Put this on a shooter. It wakes nearby machines once. L22 CORNER KIT plain defeat level: Put this on a Bell. It also wakes diagonal neighbours once. Never introduce a type on a boss. Only grant previously taught eligible types afterwards.

First capsule distinction: Boss parts become machines. Capsules hold temporary powers. Loose kickback parts still land on board. Capsule always goes to tray, no board landing marker. Coaching uses current pause/placement rules and never covers boss stage.

## Required engine checks

One grant under multi-threshold hit and repeated reconciliation; no grant on lethal hit; independent item RNG; no eligible target fallback; lifetime across moves/manual merges/automatic fuses; destination preservation on double-attached merges; automatic-root no consumption; passive no consumption; once-per-ID edge dedup/cycles; split/rest/hot interactions; capped aggregate damage; suction during selection; goal completion after inherited-effect cascade; pause/resume and scene-close discard without duplicate rewards.

## Asset integration

assets/item_{overcharge,spark,corner_kit}.png: tray/inspection icons. assets/item_badge_*.png: small owner overlays. assets/item_drop_capsule.png: in-flight container. Source PNGs preserve transparent alpha; icons also have 256px copies under icons_256/. Badge files also have 128px copies under badges_128/. Use alpha bounds and centered anchor (0.5,0.5); render owner badge relative to gadget visible upper-left, not its full source canvas. Charge pips/extra reach/animation are code. No pixel-registered full-unit overlay promised. Generation prompts and asset manifest included.
