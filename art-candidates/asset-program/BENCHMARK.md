# Benchmark: what top mobile games do, and what we take from it

## How solid this is (read first)

- **I could not look at the games' real screens.** The session's network policy blocks the App Store API and image hosts (`itunes.apple.com` was denied), and web search returns text only. So there is no side-by-side with real screenshots yet.
- What is below is two kinds of evidence, tagged on every line: **[web]** = found by web search this session (links at the bottom; many sources are thin blog posts), **[memory]** = my own knowledge of how these games look. Treat [memory] as a hypothesis to check against screenshots, not as fact.
- To fix this, either allow `itunes.apple.com` and `*.mzstatic.com` in the environment's network settings (then I pull the official store screenshots myself), or drop 20-30 screenshots into `art-candidates/asset-program/refs/` (kept out of git; see README). Section 4 is the checklist I then run.

## 1. Principles, and what each means for us

| # | Principle | Evidence | For our game |
|---|---|---|---|
| 1 | **Silhouette first.** A unit is recognisable by its black shape at small size, even in busy effects. | [web] a GDC summary on Brawl Stars character creation ties design to silhouette, personality and instant readability; [memory] same for Clash Royale troops | Review sheet row 3 (black silhouette at 64 px) is a scored gate. Detail below ~6% of the object's width does not count. |
| 2 | **A higher tier adds geometry and a better material, not just a number.** Clash Royale's star levels add golden armour details, stronger weapons and premium textures, and stay cosmetic. | [web] exitlag article on Star Level; [memory] | Rank grammar (`RANK_GRAMMAR.md`): every rank adds one visible part; ranks 3, 5, 7 also upgrade the material (brass, gold, crystal). |
| 3 | **In merge games, the item you are chasing should look like what it costs.** Higher-level items signal their rarity, which makes them satisfying to collect. | [web] gamerefinery / carry1st merge-game articles | The top rank of every unit must be clearly the most impressive thing on the board. |
| 4 | **Rank (progress) and rarity (class) are separate axes.** Tacticus separates "stars" (promotion) from "rarity" (ascension). | [web] Tacticus wiki | Rarity = frame colour and trim metal (already in the Art Bible); rank = geometry. Never use rarity colours to show rank. |
| 5 | **One colour language for all tiers.** League of Legends planned one uniform colour tier progression for all progress and rarity systems. | [web] Riot "visual design of league leveling" | One tier ladder for the whole game: steel, brass, amber, gold-white, crystal. Gold also means MAX in `marks.ts`, so ranks 5-6 use amber. |
| 6 | **High-contrast primary colours; two actions per screen.** Royal Match credits its readability to high-contrast primaries and has mostly two actions: upgrade a decoration or play. | [web] funovus, thisweekinliveops | Family colour must dominate each unit; screens keep one primary action (PLAY) plus a crate row. |
| 7 | **Chunky, glossy, bevelled UI**: thick dark outline, bright top-left specular, a darker lip along the bottom, ornament on the frame. | [memory] Royal Match, Supercell UI | Matches our `btn_green` bezel and rivets but our lip and gloss are thinner. Button targets: lip 4-6 px, gloss strip on the upper 40%. |
| 8 | **One light direction, painted value structure**: three clear values per object, the brightest and most saturated spot on the focal point. | [memory] | Greyscale row of the review sheet must still read; highlight top-left only. |
| 9 | **Low detail density.** Icons and unit sprites use few, big shapes; AI generators over-detail. | [memory]; consistent with our own review of the cannon and coil ladders | Prompts say "max ~12 distinct parts"; reviewers penalise noise at 64 px. |
| 10 | **Ornament budget grows with tier but the outline stays clean.** Top tiers get gold, gems, wings or rings attached to the object. | [memory] | Rank 5+ add gold and a glowing core; rank 7+ add a crystal material and solid floating parts. No free particles (the game adds glow and crown in code). |
| 11 | **Feedback on everything.** Animate elements in, give every interaction visible feedback, but never slow the player. | [web] bugnet, wayline juice articles | Already in the Art Bible section 6; applies to the UI assets we commission (states: idle, press, disabled). |
| 12 | **Pieces pop off the board by value contrast.** Dark outline, lighter interior, warm neutral background. | [memory] | Review sheet shows every rank on the real wood slot, not on white. |

## 2. Game by game (short; all [memory] unless a link is given)

- **Clash Royale / Brawl Stars (Supercell):** exaggerated proportions, very strong silhouettes, thick outlines, saturated flat-lit colour with painterly shading, rarity as frame colour, cosmetic evolution on top of cards. Lesson: readability first, then ornament.
- **Royal Match (Dream Games):** glossy 3D-rendered pieces, primary colours, chunky bevelled buttons, a rich themed frame around a very clean board. Lesson: richness lives in the frame and rewards, the playfield stays calm.
- **Merge Mansion, Travel Town, Merge Dragons (merge games):** painted, detailed items where each chain step is a visibly different object, with a glow or sparkle on the top steps. Lesson: the chain must read as "more valuable" at a glance; items are shown large in a clear cell.
- **Rush Royale (merge tower defence, the closest cousin to us):** units merge in a grid; rank is shown by pips and stronger effects on the unit. Lesson: show rank with a mark plus a change in the unit itself. (Details from memory: to be checked against screenshots.)
- **Idle / hero collectors (AFK Arena, Idle Heroes, Raid):** frames, stars and wings or auras for ascension. Lesson: use frames for class, geometry for progress.

## 3. What we do NOT copy

Characters, silhouettes, logos, UI layouts or colour schemes of these games. We take principles (readability, tier grammar, UI depth) and apply them to our own gadgets and our own palette. Reference screenshots are for analysis only and are never committed to the repo.

## 4. Reference shopping list and the questions I answer from it

Screens to look at (about 25): Clash Royale card collection and one card at star level 1 and 3; Brawl Stars brawler select and a rarity frame; Royal Match home, level end and a button close-up; Merge Mansion item chain (one chain, all steps); Travel Town chain; Merge Dragons dragon levels; Rush Royale unit grid; Idle Heroes ascension; Archero or Mob Control weapon upgrade; Hay Day or Township crates and rewards.

For each I record: (a) outline thickness and tint, (b) how many values and where the highlight sits, (c) how a tier change is shown (geometry, material, ornament, number), (d) button depth: lip px, gloss, bezel, (e) how many distinct parts a unit has, (f) what is the brightest thing on screen. Output: this file's tags change from [memory] to [seen], and `RUBRIC.md` anchors are re-calibrated.

## 5. Notes on generating with GPT

- **Transparency is unreliable.** One guide says GPT Image 1.5 can output alpha but GPT Image 2 dropped it, and that you should generate on a flat colour and key it out. Our pipeline already does this with white, and `tools/slice-sheet.mjs` includes the fringe clean-up. [web, single guide; check what your ChatGPT version does]
- **Consistency comes from a reference image plus a structured prompt**, not from long wording. One post describes a full sprite sheet from one reference. [web, a single author's account, unverified] That is why each prompt attaches the anchor sheets (`anchors/`) and repeats the same STYLE block.
- **Define the output contract first** (grid, number of cells, background, what is forbidden), then the art. [web, several guides agree]

## Sources (web search, this session)

- [layer.ai: item evolution chain](https://www.layer.ai/tools/layer--item-evolution-chain) (vendor page)
- [Gamerefinery: why merge could be the new match-3](https://www.gamerefinery.com/why-merge-could-be-the-new-match3/)
- [Carry1st: what sets merge games apart](https://www.carry1st.com/blog/what-features-set-merge-games-apart-from-other-mobile-games)
- [Funovus: Royal Match dominates match-3](https://www.funovus.com/blogs/royal-match-dominates-match-3-what-can-all-designers-learn/)
- [This Week in Liveops: 5 UX lessons from Royal Match](https://thisweekinliveops.substack.com/p/5-simple-ux-lessons-from-royal-match)
- [Exitlag: Clash Royale star level](https://www.exitlag.com/blog/what-does-star-level-do-in-clash-royale/)
- [Tacticus wiki: unit progression](https://tacticus.wiki.gg/wiki/Unit_Progression)
- [Riot: the visual design of League leveling](https://nexus.leagueoflegends.com/en-au/2017/12/dev-the-visual-design-of-league-leveling/)
- [Wayline: juice vs polish](https://www.wayline.io/blog/juice-vs-polish-key-differences)
- [Rangy: AI game assets, clean transparent PNGs](https://rangy.ai/blog/ai-game-assets)
