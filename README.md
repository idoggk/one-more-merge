# One More Merge: Junk Machine

Portrait one-finger merge game. Drag matching gadgets together; the new gadget fires and wakes its neighbours,
coils and bells relay the spark, cannons blast the junk monster. Beat Tin Can, Mad Fridge and Junkzilla before the clock.

Code: Claude Code. Art + design sparring: ChatGPT ("Mobile game ideas" chat). Decisions log: [DESIGN.md](DESIGN.md).

## Run it
```
npm install
npm run dev
```
Open http://localhost:5173. On your phone (same Wi-Fi): `http://<PC IP>:5173` — find the IP with `ipconfig`.
On the phone use the browser's *Add to Home Screen* to get a fullscreen app icon.

Useful URL flag: `?reset` wipes the save and records (replays the tutorial).

## Checks
```
npm test               # engine invariants (Vitest)
npm run typecheck
npx vite-node tools/sim.ts [filter]   # balance bots on the real engine
npm run build          # production build in dist/
```

## Adding ChatGPT art
1. Download the art zip from the ChatGPT chat into Downloads.
2. Unzip into `art_inbox/` (git-ignored) and run `node tools/import-art.mjs art_inbox`.
   It maps file names to game keys, trims padding and resizes into `src/assets/art/`.
3. `node tools/make-icons.mjs` rebuilds the app icons (uses `app_icon.png` when present).

Every art key is optional — missing art falls back to procedural drawings, so the game always runs.

## Not done yet
Native packaging (Capacitor), service worker/offline, keyboard accessibility, real-device performance testing,
and — most important — watching real people play (see ChatGPT's 5-person script in its research doc).
