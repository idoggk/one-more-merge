# Playtest kit — strangers (ChatGPT round 21 plan)

**Link for testers:** https://idoggk.github.io/one-more-merge/?playtest=1&reset
- `?playtest=1` = the simplified test build (no Challenge/Remix, no helpers, no cosmetics shop; Daily appears after level 10). It is remembered on that phone.
- `&reset` wipes the save once so the tester starts fresh. After the first load, open it without `&reset`.
- Add to Home Screen (Safari → Share) is optional for testers; the browser works too.

## Plan (20 people)
1. **5 diagnostic sessions** → fix the big failures → **15 validation sessions**.
2. One instruction only: **"Play until you want to stop."** Don't explain chains, don't rescue them in the first 5 minutes.
3. Afterwards ask them to **show you**:
   - a valid merge,
   - a chain that goes through a relay (Coil/Bell) into a shooter,
   - what a boss part does when it lands on the board.
4. Ask: *"What made you stop?"* and *"Which moment felt best? Which felt annoying?"*

## Validation gates (15 people)
- 12/15 explain matching on their own (same machine + same number).
- 10/15 demonstrate a chain.
- **0** stuck sprites or double merges.

## Boss trial (separate, after their natural session)
On a copied save (or a second phone), let them play **Level 10 — Tin Can King**. Watch:
- Do they notice the warning? Do they understand the marked cell?
- Do they try to move the machine away?
- Do they recognise the defeat?
Ask: *"What did the boss make you do differently?"*

## Watch & note per person
| Question | Notes |
|---|---|
| Seconds to the first merge; where they hesitated | |
| After the first chain: "What made the others fire?" | |
| Do they ever move a piece on purpose to set up a chain? | |
| Did they notice the falling boss part and where it came from? | |
| At each result: do they press NEXT LEVEL without being asked? | |
| Fail → retry, use a booster, or quit? | |
| Did they come back within 24-48 h (ask later)? | |

## Data
- **Settings (⚙) → Playtest stats**: win rate by difficulty, attempts per clear, boosters bought/used, highest rank.
- **Pause → export playtest log**: a JSON file with every event, including `drag_end` (what they tried to merge vs what happened), `level_start/end`, `boss_warn/hit`, boosters, lessons.
- Report counts and individual stories, not percentages: 20 people are a diagnosis, not a forecast.

If players admire the effects but can't say *why* things fired, fix readability before adding content.
