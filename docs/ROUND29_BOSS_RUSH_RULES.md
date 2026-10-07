# Boss Rush — round 29

Design proposal; HP must be fitted in the live engine. No simulation results are claimed.

Unlock on first clear of L20, and require at least one beaten mini-boss and two beaten chapter bosses. Three sequential fights: mini, boss, distinct boss. Only defeated saga opponents enter the eligible pools. Use a dedicated event RNG stream so selection never alters board RNG.

## Weekly course

UTC Monday 00:00 identifies a week. On first entry, snapshot eligible pools, select without replacement using the week seed, and persist the three opponent IDs, board seeds and fitted HP config version. Sorting eligible IDs before selection is mandatory. Course is local-player comparable, not a global leaderboard: players with different eligible pools may get different courses. Do not change the course when the player clears another saga boss that week.

Fresh 30-cell board per fight, existing 16-starter generator at rank 2, rank cap 6, copy cap 4, Cannon/Coil/Bell supply only. Use the existing boss packet/delivery rules with fixed event configuration. No helper, Rocket, Kit, Capsule or pre-level booster. No carry-over board, Overdrive meter, attachments, warnings, hazards or time. Mini clock 60s; boss clocks 75s. Clock starts after normal skippable entry. Opponent attack schedules/rules and armor phases remain unchanged; each battle is independent. Ordinary Kickback remains; one seeded item replaces the 50% kickback as in the saga. No item tutorial interrupts Rush; only already learned item kinds can be selected, fallback to plain Kickback if none learned.

Fit Rush-specific HP for random-3s bot without item use at 85%, 80%, 75% conditional individual fight targets. Do not scale saga HP blindly. Freeze fit values for a week. At fit time test all eligible opponent/presentation-stage combinations. Death clears hazards before result. Timeout ends the whole attempt. Unlimited free retries from fight 1.

## State and records

Record compares completed fights first; for equal positive completed-fight count compare summed simulation clear times of completed fights, lower better. Failed-fight elapsed time is excluded from comparison; show it separately in attempt history. Zero-fight attempts have no speed record. Pause/explainer/background time excluded. Suspend persists the current board/RNG/clock/attack state, resume freezes until visible. Leaving the event explicitly forfeits the attempt after confirmation.

Persist a per-attempt id and a per-week settlement ledger. Week rollover does not mutate an in-progress attempt: it can finish its original course and settle to its original week; new attempts use the new course. Keep distinct completed-week counters. No replay is counted twice.

## Rewards

Highest fight milestone cleared in a week gives cumulative 8 / 18 / 40 Bolts. Settle only positive difference from previous cumulative grant, idempotently. An early exit may claim an earned stage delta. Disable saga first-clear, replay, star, eligible-fail and daily-level bonuses here; Rush is its own settlement path. No Bolts for a zero-fight failure. Display earned weekly amount, not another full prize on every retry.

First complete course awards permanent Rush medal. Completed courses in 3 and 6 distinct weeks award two cosmetic finishes; no power, duplicates or currency cost. Reuse existing medal/chest presentation, with a Rush label, rather than inventing a new chest economy. Winning an individual Rush fight permanently adds one gold Rush stamp to that opponent's Monster Book entry, even if the attempt later fails. No competing full-frame border. Book filter can show Rush-stamped opponents.

## UI

EVENTS card: three portraits, '3 FIGHTS · FRESH BOARDS', earned weekly reward, START RUSH (>=52px). Reveal all attacks and board rules before starting. Between fights: completed portraits ticked, next opponent's existing rule diagram, NEXT FIGHT. No automatic start countdown. End screen: fights cleared, total completed-fight time, reward DELTA, medal if first eligible milestone, TRY AGAIN. Restore settings and saga loadout after exit. No lives, entry currency or ads.

Telemetry: rush_enter(course_id/config), rush_fight_start/finish(index/opponent/clear_time), rush_attempt_end(completed_count/cause), rush_settle(delta/week/id), rush_book_stamp. Compare attempt completion and repeat attempts separately; fast retries must not be interpreted as new-week retention.
