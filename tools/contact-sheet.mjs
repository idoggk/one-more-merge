// Contact sheet of numbered frames fNN.jpg: node tools/contact-sheet.mjs <outPng> <cols> <cellW> <dir> <from> <to> [step=1]
import puppeteer from 'puppeteer-core';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [out, colsS, cwS, dir, fromS, toS, stepS] = process.argv.slice(2);
const cols = Number(colsS), cw = Number(cwS), ch = Math.round((cw * 844) / 390), step = Number(stepS ?? 1);
const files = [];
for (let i = Number(fromS); i <= Number(toS); i += step) {
  const f = `${dir}/f${String(i).padStart(2, '0')}.jpg`;
  if (existsSync(f)) files.push([i, f]);
}
const rows = Math.ceil(files.length / cols);
const cells = files.map(([i, f]) => `<div class="c"><img src="data:image/jpeg;base64,${readFileSync(f).toString('base64')}"><b>${i} · ${i * 100} ms</b></div>`).join('');
const html = `<body style="margin:0;background:#222"><style>.c{position:relative;width:${cw}px;height:${ch}px;float:left}img{width:100%;height:100%}b{position:absolute;left:4px;top:4px;color:#fff;background:#000a;font:14px monospace;padding:1px 4px}</style><div style="width:${cols * cw}px">${cells}</div>`;
mkdirSync(dirname(out), { recursive: true });
const browser = await puppeteer.launch({ executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
await page.setViewport({ width: cols * cw, height: rows * ch });
await page.setContent(html);
await page.screenshot({ path: out });
await browser.close();
