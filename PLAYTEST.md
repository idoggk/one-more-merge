# Playtest script (5 minutes per person)

From ChatGPT's research doc, adapted to this build. Five people are a usability starting point, not retention evidence.

## Setup
1. On the test phone open the game with `?reset` once (fresh tutorial), then remove `?reset` from the URL.
2. Sound on. Hand over the phone. **Say nothing about how to play.**

## Watch (write it down)
| # | Question | Notes |
|---|---|---|
| 1 | Seconds until the first merge? Where did they hesitate? | |
| 2 | After the first chain: *"What made the other gadgets fire?"* (Can they name the relay?) | |
| 3 | Do they ever **move** a piece on purpose to set up a chain, or only merge pairs? | |
| 4 | When the first panel breaks and the Kickback lands: do they notice it? Do they understand it came from the monster? | |
| 5 | Do they use Scrap? Is it their main action (bad) or an escape valve (good)? | |
| 6 | At the result screen: do they press ONE MORE without being asked? | |
| 7 | *"Which moment felt best? Which control felt annoying?"* | |

## Gates (from the design doc)
- Most players merge within ~10 s and can explain the first causal link.
- Some players rearrange after understanding relays.
- Scrapping is rare.
- At least some players retry unprompted.

If players admire effects but can't say *why* things fired, fix readability before adding content.
Don't patch a weak core with daily rewards or a shop.

## Data
Pause menu → **export playtest log** saves a JSON file with a per-run summary
(first merge time, merges, moves, invalid drags, scraps, biggest chain, kickbacks, result, retry).
Everything stays on the device; nothing is sent anywhere.
