// Publish the home-screen app: build, then force-push dist/ to the gh-pages branch (GitHub Pages serves it).
// Live at https://idoggk.github.io/one-more-merge/  Usage: npm run deploy
// The last few builds' hashed files stay on the site (builds.json), so a phone holding an older index.html
// never hits a 404 chunk. See docs/design/LAUNCH_VERSION_FIX.md.
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { planKeep } from './deployKeep.mjs';

const REMOTE = 'https://github.com/idoggk/one-more-merge.git';
const PREV = '.deploy-prev';
const sh = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const rev = execSync('git rev-parse --short HEAD').toString().trim();
sh('npm run build');

// previous site (builds.json + the files it lists); a missing branch or file just means nothing to keep
rmSync(PREV, { recursive: true, force: true });
let history;
try {
  sh(`git clone -q --depth 1 -b gh-pages ${REMOTE} ${PREV}`);
  history = JSON.parse(readFileSync(join(PREV, 'builds.json'), 'utf8'));
} catch {
  console.log('no previous builds.json: keeping only this build');
}
const { id } = JSON.parse(readFileSync('dist/version.json', 'utf8'));
const files = readdirSync('dist/assets').map((f) => `assets/${f}`);
const plan = planKeep(history, { id, files });
let kept = 0;
for (const f of plan.copy) {
  if (!existsSync(join(PREV, f))) continue;
  mkdirSync(dirname(join('dist', f)), { recursive: true });
  cpSync(join(PREV, f), join('dist', f));
  kept++;
}
writeFileSync('dist/builds.json', JSON.stringify(plan.history));
rmSync(PREV, { recursive: true, force: true });
console.log(`kept ${kept} older hashed files from ${plan.history.length - 1} previous builds`);

rmSync('dist/.git', { recursive: true, force: true });
writeFileSync('dist/.nojekyll', '');
sh('git init -q -b gh-pages', 'dist');
sh('git add -A', 'dist');
sh(`git commit -q -m "Deploy ${rev}"`, 'dist');
sh(`git push -f -q ${REMOTE} gh-pages`, 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log(`deployed ${rev} -> https://idoggk.github.io/one-more-merge/`);
