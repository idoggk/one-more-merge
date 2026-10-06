// Publish the home-screen app: build, then force-push dist/ to the gh-pages branch (GitHub Pages serves it).
// Live at https://idoggk.github.io/one-more-merge/  Usage: npm run deploy
import { execSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';

const sh = (cmd, cwd = '.') => execSync(cmd, { cwd, stdio: 'inherit' });
const rev = execSync('git rev-parse --short HEAD').toString().trim();
sh('npm run build');
rmSync('dist/.git', { recursive: true, force: true });
writeFileSync('dist/.nojekyll', '');
sh('git init -q -b gh-pages', 'dist');
sh('git add -A', 'dist');
sh(`git commit -q -m "Deploy ${rev}"`, 'dist');
sh('git push -f -q https://github.com/idoggk/one-more-merge.git gh-pages', 'dist');
rmSync('dist/.git', { recursive: true, force: true });
console.log(`deployed ${rev} -> https://idoggk.github.io/one-more-merge/`);
