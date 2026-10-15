# Map badge batch 2, v2 (t-462bc28b): applies CRITIQUE_88

Three ChatGPT images, one chat, one try each (no redo spent, no limit hit). Style reference attached: painted road map mock `normal_try1.png`. The primer was condensed to a single message; "steampunk" removed and replaced with "bright, clean, glossy painted cartoon like the mock", with explicit NO glow/halo/outline-glow, flat `#00FF00` key, brass under 20 percent. Raw sheets in `raw/`, full-res trimmed PNGs in `full/`, game-size 2x WebP in `final/` (fit inside the v1 size box, aspect kept), `contact-dark.png`, `contact-light.png`, `strip44-gray.png`. Keyed by a script (green key with soft ramp, despill, 1 px alpha erode, 7 percent pad); script deleted. Self-scored only: needs an independent critic pass.

| Critique item | New file | Result |
|---|---|---|
| REDO 1 ready bases (3) | badge_base_{brass,copper,teal}_ready | Wider flared rim, raised cream dome, yellow star pip on top, no outline glow, no pale halo on dark or light. Differs from idle by silhouette (star pip + rim) and part count. Idle bases were not regenerated: compare against v1 idle in the integration step. |
| REDO 3 ring ready | road_chapter_ring_ready | Bright gold segments, open chest with coins and stars. No outer outline. |
| REDO 4 ring open | road_chapter_ring_open | Green-grey segments, open EMPTY chest, check badge. Differs from ready in accent colour, part count, pip. |
| FIX 10 ring idle | road_chapter_ring | Light stone/tan segments, closed chest (brighter than v1). Grayscale strip shows idle / ready / open separate at 44 px. |
| REDO 2 tab_icon_machine | tab_icon_machine | One wrench on a cream tile, 2 detail clusters. |
| REDO 5 tab_active_plate | tab_active_plate | Flat bright yellow rounded plate, thin brown outline, no glow. Large corner highlight is a bit glossy; flat-fill it in code if needed. |
| FIX 7 lock steel | badge_lock_steel (new) | Grey-blue steel padlock, hole transparent. |
| FIX 7 lock gold | badge_lock_closed | Clean gold padlock, no green line. |
| FIX 6 gear | badge_glyph_gear | Hole transparent, no green line. |
| FIX 8 ribbon lock | badge_ribbon_lock | Padlock about 35 percent of ribbon width. The ribbon came wavy/curled, so the piece is 117x88 (v1 was 192x88); use as a corner ribbon or re-roll if a flat ribbon is needed. |
| FIX 12 offers | badge_glyph_offers_gem (new) | Blue gem with a red flag, no text. Alternative to the blank tag. |
| FIX 9 track | road_chapter_track | 8 wide slots, chest cap about 2x track height. |
| FIX 11 tab bar | tab_bar_plate | Navy body with thin gold edge, 885 px wide (2x spec). |

Not redone (critique FIX 12 rail_plate, kept as text backing). Glows for ready/open/active are to be drawn in code.

Not wired into src/ (out of scope). Registry update left to the integration task.
