import { boot, wait } from '../../tools/unit-audit-lib.mjs';
const { page, close } = await boot(390, 844);
await page.evaluate(async () => {
  const sc = window.__omm.game.scene.getScene('game');
  const un = await import('/src/content/units.ts');
  sc.meta.tips = new Proxy({}, { get: () => true, set: () => true });
  sc.meta.units = {};
  for (const u of un.UNITS) sc.meta.units[u.id] = { level: 5, cards: 3 };
  sc.openTitle('machine');
  sc.openUnitsTab();
});
await wait(1500);
for (let i = 0; i < 4; i++) {
  await page.screenshot({ path: `art-candidates/unit-display-audit/q${i}.png` });
  await page.mouse.move(195, 500);
  await page.mouse.wheel({ deltaY: 500 });
  await wait(700);
}
await close();
