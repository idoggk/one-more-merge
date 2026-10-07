# Round 27 — six mini-bosses and chapter escalation

Design proposal for Claude's engine; no live-engine simulation in this workspace. Refit and validate held-out seeds before treating targets as outcomes. These mini-bosses replace levels' previous goal/modifier, not stack with them.

## Saga placement and format

L8 Pressure Popper, L18 Carousel Crab, L28 Vanity Moth, L38 Brick Printer, L48 Scrap Kraken, L58 Spring Jack. One 60 s clock; 16 starters using existing chapter composition/ranks; existing packet controller and aggregate MAX HIT. Goal DEFEAT. Cosmetic sprites intact above 66%, cracked 66–33%, critical<=33%; no mechanical phases/armor resistance.

Warning starts 8 s then 20/32/44 s. 2.5 s telegraph. One attack at a time. Mini-boss targets novice 95/92/90/88/86/85% across chapters 1–6. Mark MINI-BOSS, not Hard. Preserve normal kickback and configured item 50% replacement from L13; no new attachment lessons here.

Sequencing patch: L8 replaces first Shield introduction, so change L11 to an easy Mad Fridge DEFEAT/CHAIN SHIELD introduction (95% target); L13 then has familiar shield plus new OVERCHARGE. Move L28 MAKE RANK 7 goal to L27 (Fan already introduced L23, no enemy attack), before Mirror mini-boss takes L28. Explicit item teachings at L13/L16/L22 and Fan L23 remain. L38/L48 guaranteed-item rehearsals and L58 chain objective are replaced, not required to be carried to another level.

## Global deterministic contract

Row-major ties, target eligibility uses permanent masks, reservations, inert blocks and temporary restrictions. No random retarget on impact. Resolve complete player input/BFS first, damage/panels/phase/kickback planning next, boss impact next, passive shots then supply. All board mutations commit outside BFS. No moves during traversal; IDs, attachments and primers travel with forced moves. Forced moves never merge/activate or complete rank goal.

Store marked cell coordinates and cast token. Own warning reservations are exempt only for the action that resolves/defuses that cast; any different reservation is a conflict. At impact revalidate current cell residents, never chase original ID. No eligible target skips scheduled cast without retry. Clear warnings/reservations and temporary blocks on death immediately.

If held source moves or disappears, cancel drag and reconcile by current ID/location. Otherwise preserve a drag but revalidate its drop destination after board mutation. Never retain stale source coordinates. Attack preview lines reflect target cells, not an ID following a moved sprite.

## Pressure Popper — BOMB

Choose empty eligible cell with greatest occupied orthogonal-neighbour count, row-major tie; require >=1 neighbour. Reserve for warning and show board_bomb_part.png. Overlay is not gadget/BFS ID and does not add occupied count. Reserved cell unavailable to supply and helper movement. Manual movement into this cast's cell is a special permitted destination: commit machine normally, immediately defuse/remove hazard/release reservation. No free merge or activation.

A player-rooted cascade activating any orthogonal neighbour during warning also defuses after full BFS. Passive/automatic-root activation never defuses. At impact if still armed, remove at most one adjacent rank 1/2 eligible gadget, lowest rank then row-major. Exclude reservations/protected cells. Higher ranks safe. Remove attachment with piece, no compensation. If none qualify harmless pop. Always remove bomb/reservation. Max one bomb. No rank downgrade, multi-piece blast or monster damage.

Card: Cover the bomb with a machine before it pops.
Lane: BOMB · Cover it or fire beside it · 2.5 s
Success: DEFUSED! for 700 ms.

## Carousel Crab — CONVEYOR

Choose eligible row with most gadgets, lowest row tie; >=2 gadgets required. All 5 cells permanently playable; no reservations, inert blocks, temporary restrictions. Mark rightward rotation. At impact entire-row eligibility revalidated; any conflict skips full cast. Rotate all 5 contents simultaneously one column right, including empties, col 4 wraps to 0. Preserve IDs/ranks/attachment/primer. No merge/activation, no goal credit. Animation simultaneous 180 ms; logical commit precedes animation and previews use new cells. Cancel moved held piece drag.

Card: This row slides right. Plan its new neighbours.
Lane: ROW SLIDES RIGHT · 2.5 s

## Vanity Moth — MIRROR SWAP

Highest-rank eligible occupied cell, then lowest-rank other eligible occupied cell with a different family, rank, attachment state or primer state; ties row-major. If no distinct eligible second target exists, skip. Never warn for a gameplay-identical swap. Mark fixed cells and connecting arc. At impact swap current contents including empties. Both empty whiff. Any new reservation/block/restriction in either cell skips whole cast. Simultaneous commit, IDs/attachments/primers travel. No merge/activation/rank-goal credit. Animation 180 ms, no input-authority delay.

Card: The marked cells swap their machines.
Lane: MARKED CELLS SWAP · 2.5 s

## Brick Printer — JUNK BLOCKS

Max 2 live blocks. If cap reached skip. Select up to remaining cap empty eligible cells with>=1 occupied orthogonal neighbour; neighbour count descending then row-major. Reserve/mark. At impact occupied or different-reserved targets whiff independently; no replacement. Valid targets gain inert block; release own warning reservation as block owns occupancy.

Blocks occupy cells but are not gadget IDs, activatable or mergeable. Exclude from gadget occupancy used by packet controller, but landing availability excludes them; permanent capacity denominator unchanged. Neighbour player-rooted activation clears block after BFS. No extra chain activation/cascade/reward. Passive/automatic root cannot clear. Free existing scrap interaction clears block; no Bolts/item/material. Each expires after 8 simulationseconds. Death clears all. Helpers treat block as opaque/ineligible cell under existing mask/reservation convention.

Card: Fire beside junk blocks to clear them.
Lane: JUNK INCOMING · Fire beside blocks to clear · 2.5 s

## Scrap Kraken — MAGNET PULL

Source eligible occupied cell row>0 with immediately-above cell empty eligible. Highest rank then row-major. Mark source/destination and UP arrow. Destination stays unreserved during warning; player or ordinary supply can occupy it to block pull. At impact move current eligible source resident exactly one row up only if destination still empty eligible. Otherwise whiff. No retarget, multistep movement, displacement/merge/activation. Attachment/primer travels.

Card: It pulls a marked machine one cell upward.
Lane: PULL UP · Move it or block the arrow · 2.5 s

## Spring Jack — BOUNCE

Source eligible occupied cell with most occupied orthogonal neighbours, row-major tie. Destination eligible empty cell with greatest Manhattan distance from source, row-major tie. Require both. Mark both plus visible arc; destination never selected at impact and remains unreserved so player/supply may block it. At impact move current eligible source resident into still-empty eligible destination, else whiff. Preserve ID/attachment/primer. No activation/auto-merge/extra bounce. This is deterministic, not random relocation.

Card: The marked machine bounces to the empty circle.
Lane: BOUNCE TO THE CIRCLE · 2.5 s

## Items, goals, cap and settlement

Attacks cannot damage monster HP. Attachment damage/edges operate under ITEM_RULES and MAX HIT caps full player-cascade damage once. Item neither protects against attacks nor amplifies hazards. Movement/swaps preserve charges, destruction loses attachment. Defuse/block-clear zero chain activations. Actual neighbours still count normally toward any configured chain goal. Goal is defeat for all listed mini-bosses. Boss death authoritative before presentation, no simultaneous lethal-hit attack or extra item grant. Capsule to tray, actual parts to eligible board cells.

## Chapter bosses — second signature at final phase

King CLAMP + BOMB; Fridge FROST ROW + CONVEYOR; Viper SUCTION + MIRROR SWAP; Twins HOT COLUMN + JUNK BLOCKS; Piano REST ROW + MAGNET PULL; Junkzilla SPLIT + BOUNCE.

Above 33% HP existing attack unchanged. On <=33% finish current warning/effect; no immediate cast. Next scheduled warning SECONDARY, then alternate secondary/primary/secondary. This supersedes the initial chat suggestion to lead with primary again; fast clears otherwise often miss the second signature. Existing 8 s first warning,12 s cadence,2.5 s telegraph. Snapshot phase and kind at warning start. Secondary uses fixed mini rules, not scaled phase duration. Before any subsequent cast require no remaining active primary restriction/secondary hazard; if blocked skip schedule without advancing alternation. A skipped no-target attack also does not advance alternation. One shared HP bar, original 90 s clock, no resistance/new supply rule. Large hit/kill preserves all damage and may skip phase presentation.

Phase lane FINAL PHASE · NEW ATTACK 900 ms, then warning actual name. Boss card shows both icons and Final phase: also uses [attack]. No midfight forced lesson. Mini experience prepares preceding chapter boss. If future chapters replay out of order, card remains sufficient preview; no unannounced extra attack.

## Presentation and art

Six unique mini silhouettes, no gold crowns. Cosmetic states share stance/camera as closely as generated art permits; use stage feet 88%,max width 78%,max height 80%,top clearance 12 px. Manifest supplies alpha bounds. Recalibrate state anchors / face patches; no pixel-rig guarantee. Use existing short dust crossfade for state swap.

Six icon files miniboss_telegraph_{bomb,conveyor,mirror,blocks,pull,bounce}.png,24–28 CSS px. Board props board_bomb_part.png and board_junk_block.png,fit 44–48 px. Warning countdown/geometry/directional arrows rendered in code; coral dashed warning, solid active boundary. Item badges remain separate. Bomb defuse and block-clear effects use existing spark/poof, no new full-screen flash.

Mini victory: existing monster-local collapse and board wave, MINI-BOSS DOWN! lane then ordinary level result. No chapter chest/medal. Normal per-level first-clear reward; no new currency or extra boss grant. Chapter bosses retain chapter rewards.

## Validation

Test own-reservation exception for manual bomb parking; defuse before impact at same timestamp; passive does not defuse/clear; no adjacent rank>=3 destroyed; row wrap with empties; swap with vacated cell; invalid pair full-cast skip; independent block targets plus TTL/pause/scrap/death; packet availability under 2 blocks; no eligible pull/bounce skip; occupied destination whiff; dragged piece reconcile; attachment/primer preserve; warning phase snapshot; no overlapping attack; skipped cast does not advance alternation; large hit death cancels without phantom rewards. Simulate reactive avoidance policies as well as random merges.
