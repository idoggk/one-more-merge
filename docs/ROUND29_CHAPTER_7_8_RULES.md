# Chapters 7–8 — round 29

Design proposal. Live-engine calibration required. 29 new master PNGs use built-in image generation; no engine implementation or fit was run here.

Chapter 7: PACKING DEPOT, Parcel Pup and Pallet Pal. Chapter 8: OBSERVATORY SALVAGE, Telescope Toad and Radar Rascal. Ordinary characters are visual IDs; inherit the table's mechanics. Keep familiar Mad Fridge at L63 and Vacuum Viper at L73 for their familiar behaviours. No rank 9, new currency or fourth item.

## Level defaults

Rank cap 8, copy cap 7, existing chapter-6 packet/delivery phases and matchmaker tuning, existing MAX HIT aggregate cap. Ordinary levels use existing PAIR8 at starting rank 2 plus specified existing start_extra. Ordinary DEFEAT clock 75s; MAKE/CHAIN clock 90s; mini-boss 60s/16 starters at rank 2; chapter boss 90s/16 starters at rank 2. These are explicit defaults to fit, not inherited unknown clock/rank values. Existing item system: one capsule at 50% break, no extra scripted item; goal-only levels retain existing goal-level capsule rules, not a new HP trigger. L66 uses existing seeded item selection, not a second item. No new item/star/helper lesson.

Mini warnings at 8/20/32/44 simulation seconds; chapter warnings at 8s then every12s. Warning 2.5s, one effect at a time, skip schedule while active. Mini66% damage state is cosmetic; at<=33% its next scheduled warning is secondary first, then alternate. Chapter armor at66/33%, final phase also secondary first then alternate primary/secondary; finish active warning/effect, never overlap. Skip/no-target does not advance alternation. No forced survival gate. Oil Otter secondary=the exact existing Carousel Crab CONVEYOR; Portal Possum secondary=the exact existing Vanity Moth MIRROR. Do not change these known targeting/collision rules. Both minigame cards show both icons; reuse v19 icons for secondaries. No extra new attacks or new art claimed for those known secondaries.

## Determinism and event ordering

Each attack needs its own pure target planner and immutable warning snapshot. Row-major ties. Cells must be playable, unrestricted, not blocked or reserved by another system. Own oil/portal terrain does not make its own cell invalid for the defined manual-drop rule. No targeting creates an engine gadget ID. Terrain is excluded from gadget occupancy and packet thresholds; playable capacity denominator unchanged. Oil and portals do not reserve cells or suppress deliveries. Effects expire using simulation time.

At the same timestamp: process the valid player command and its complete bounded BFS (including normal helper operations, real item activations, goal credit, MAX HIT damage settlement and death); then expired effects; then due attack impacts; then due delivery packet. Death cancels all warnings/effects before later steps. New attack impacts never interrupt BFS to move anything; normal existing helper logic remains part of its normal engine resolution. Cosmetic animation never changes this order. Warning deadline accepts a player cascade committed at that timestamp. Existing scheduler must use this declared order for the new attacks.

IDs, primers and attachments travel with movement. Forced moves never merge, fire, change ranks or give goal credit. Revalidate drop against current engine state on release. Attack touching a held ID cancels drag and reconciles before animation. No arbitrary retargeting. All item damage stays within the same cascade's MAX HIT aggregate. Any removal cancels relevant tow/ransom markers. Tests must include held pieces, masked corners, reservations, blocked helper moves and exact warning timestamps.

## SLICK — Oil Otter, L68

Plan: empty eligible source with most occupied orthogonal neighbours, require >=1; row-major. A source is eligible only when it has an empty eligible orthogonal destination. Choose U,R,D,L first eligible direction. Fix source/direction at warning, no reservation. At impact source must still be empty and eligible or whiff; destination may now be occupied. Place oil at source for4s. Manual drop on EMPTY oil source slides one tile along arrow iff destination is empty/eligible at release; otherwise land normally at source. Preview final destination. Occupied source uses normal merge/bounce. No secondary merge, repeated slide, passive/delivery/Kickback/helper/cascade effect. Expiration moves nothing. Oil cannot override masks/restrictions or merge legality.

Card: Drops on oil slide one cell along the arrow.
Warning: OIL IN 2.5s · Drops slide along the arrow
Active: SLICK · Preview your landing

## TOW BAR — Rivet Rhino, L70

Plan orthogonally adjacent eligible pair of gadgets, highest rank sum, tie sorted pair cell indices. Fix IDs. Impact requires both exist, still adjacent and unrestricted. Link4s. Manual move into empty cell translates both by same row/col delta; destinations must be two distinct playable eligible cells, occupants from linked pair allowed, any other occupant invalid. All-or-nothing atomic move; preview both ghosts; no rotation. Legal manual same-family/same-rank merge involving either ID releases tow before ordinary merge; partner stays. Other occupied drops bounce even in optional swap mode. Automatic fuse/removal/helper movement releases link first then executes normal operation. If helper cannot execute its normal move, release does not occur. No chain or item charge consumption from tow.

Card: Linked machines move together. Merge either to release them.
Warning: TOW BAR IN 2.5s · Two machines will move together
Active: LINKED · Preview both landings
Final secondary SLICK first, then alternate TOW BAR/SLICK.

## PORTALS — Portal Possum, L78

Plan pair of empty eligible cells with maximum Manhattan distance>=4; sorted pair cell-index tie. No reserve. Both must still be empty/eligible at impact or whole attack whiffs. Cyan first cell, violet second; discs4s. Manual drop on EMPTY portal goes to partner iff partner empty/eligible at release, otherwise stays at dropped-on cell. Preview final exit, teleport exactly once. Occupied portals use ordinary merge/bounce. Never auto-merge, activate, consume attachment charge or move deliveries/Kickback/helpers. Portal is an optional shortcut; no negative damage modifier. No cascade graph edge. Expiration moves nothing.

Card: Empty portals let you move a machine across the board.
Warning: PORTALS IN 2.5s · Preview the exit before dropping
Active: PORTALS · A shortcut across your board

## TIME RANSOM — Chrono Chimera, L80

Plan two eligible gadgets of different families with highest rank sum, sorted pair cell-index tie. Fix IDs. During2.5s warning, one completed PLAYER-rooted BFS activating both disarms. Real item BFS activations count, particle/render events do not. Passive shots, automatic fuse cascades and separate player cascades do not count. Never add an activation or graph link merely because of a ransom marker.

Manual merge transfers a marker to result ID BEFORE root BFS; if both markers converge into that manual-merge result, disarm immediately. Automatic fuse transfers markers but cannot disarm by itself: if they converge, the surviving ID must subsequently activate in a player BFS to disarm. Removal of either marked ID disarms without reward. Never retarget. At unresolved impact subtract2.0s remaining simulation budget, clamp0, once; no HP damage. Counts as2s effective elapsed for live star countdown/clear-time scoring; thresholds remain unchanged. A lethal completed player cascade cancels ransom before it takes time. If deduction reaches0, ordinary timeout result; never schedule another attack after it.

First-ever L80 warning: freeze next to pair, Wake both in one chain to save two seconds., GOT IT resumes. Subsequent warnings normal. Freeze attack/clock/effects together. This teaches only the new signature.

Card: Wake both marked machines in one chain to protect the clock.
Warning: TIME RANSOM · Wake both in one chain · 2.5s
Resolve700ms: TIME SAVED! or −2s · TIME TAKEN
Final secondary PORTALS first, then alternate TIME RANSOM/PORTALS. Portals prepare a shortcut for next ransom; no overlap.

## Chapter table

| L | Character | Focus | Goal | Behaviour/twist/helper | Tag | Random-3s fit target |
|---|---|---|---|---|---|---|
|61|Parcel Pup|Free rebuilding|DEFEAT|none|RELIEF|95%|
|62|Pallet Pal|Tall gadget|MAKE R6|none|NORMAL|92%|
|63|Mad Fridge|Familiar shield|DEFEAT|chain shield|NORMAL|90%|
|64|Parcel Pup|Build around gaps|DEFEAT|GAPS|NORMAL|88%|
|65|Pallet Pal|Fan positioning|CHAIN x16|Fan start extra|HARD|78%|
|66|Parcel Pup|Item rehearsal|DEFEAT|none; ordinary capsule|RELIEF|95%|
|67|Pallet Pal|Pulled connection|MAKE R7|Magnet start extra|NORMAL|88%|
|68|Oil Otter|SLICK|DEFEAT|mini only|MINI|85%|
|69|Parcel Pup|Recharge|DEFEAT|Battery start extra|RELIEF|94%|
|70|Rivet Rhino|TOW BAR/SLICK|DEFEAT|boss only|BOSS|75%|
|71|Telescope Toad|Free board|DEFEAT|none|RELIEF|95%|
|72|Radar Rascal|Primed chain|CHAIN x16|Battery start extra|NORMAL|92%|
|73|Vacuum Viper|Familiar suction|DEFEAT|light suction|NORMAL|90%|
|74|Telescope Toad|Rank around corners|MAKE R7|CORNERS_2|NORMAL|88%|
|75|Radar Rascal|Crowded connection|CHAIN x18|none|HARD|78%|
|76|Telescope Toad|Rocket refresh|DEFEAT|Rocket shooter override|RELIEF|95%|
|77|Radar Rascal|Familiar frost|DEFEAT|light frost|NORMAL|88%|
|78|Portal Possum|PORTALS|DEFEAT|mini only|MINI|85%|
|79|Telescope Toad|Calm rank payoff|MAKE R7|none|RELIEF|94%|
|80|Chrono Chimera|TIME RANSOM/PORTALS|DEFEAT|boss only|BOSS|75%|

Reuse existing MAKE/CHAIN settlement, not a new AND-defeat win rule. Fit HP and goal seed feasibility in live engine using matched fit/held-out seeds, random-3s, fast greedy, goal-aware builder and item-aware policies. Targets are proposals, not measured. Relief61/66/69/71/76/79. Goal levels must have reachable goals for the shipping seed pool. For portal mini, measure portal-use frequency separately: higher HP alone is not proof people understood the shortcut.

Chapter7/8 extend ordinary chapter rewards and existing medal/chest cadence at70/80; no new economy rules. Do not reuse old face patches on new sprites.
