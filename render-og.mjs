/**
 * Renders og.png (the social share card) from the live page itself, so the card
 * always shows the real diagram rather than a mock-up.
 *
 * Needs the dev server running:  npx serve -p 5202 booga-diagram
 * Then:                          node render-og.mjs
 *
 * Re-run this whenever the masthead or the career plot changes, otherwise the
 * card that people see when they share booga.me goes stale.
 */
import { chromium } from '/opt/homebrew/lib/node_modules/openclaw/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';

const OUT_RAW = new URL('./og_raw.png', import.meta.url).pathname;
const OUT = new URL('./og.png', import.meta.url).pathname;

const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  channel: 'chrome',
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2,
  colorScheme: 'light',
});
const page = await ctx.newPage();
await page.goto('http://localhost:5202/', { waitUntil: 'load' });
await page.waitForTimeout(1200);

/* the page opens on Media, which is a shelf and has no plot — the share card
   wants the career plot, so select that series explicitly before capturing */
await page.click('.tab[data-mode="career"]');
await page.waitForTimeout(500);

/* compose for the card: keep the identity and the plot, drop the interactive furniture */
await page.addStyleTag({ content: `
  html, body { overflow: hidden !important; }
  .wrap { padding: 44px 52px 0 !important; max-width: none !important; }
  header { margin-bottom: 18px !important; }
  h1 { font-size: 38px !important; margin-bottom: 10px !important; }
  .standfirst { font-size: 15.5px !important; max-width: 1060px !important; line-height: 1.5 !important; }
  .contact, .switcher, figcaption, .entries, footer { display: none !important; }
  .plot-scroll { display: flex !important; justify-content: center !important; }
`});
await page.waitForTimeout(300);

/* size the plot to exactly fill the remaining height (svg aspect = 430/1000),
   so the year labels along the bottom never clip */
const fit = await page.evaluate(() => {
  const svg = document.querySelector('.plot-scroll svg');
  const top = svg.getBoundingClientRect().top;
  const w = Math.min(1096, Math.floor((622 - top) / 0.43));
  svg.style.setProperty('width', w + 'px', 'important');
  svg.style.setProperty('min-width', '0', 'important');
  return { top: Math.round(top), width: w, bottom: Math.round(svg.getBoundingClientRect().bottom) };
});

await page.screenshot({ path: OUT_RAW, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

execFileSync('sips', ['-Z', '1200', OUT_RAW, '--out', OUT], { stdio: 'ignore' });
execFileSync('rm', ['-f', OUT_RAW]);

console.log(JSON.stringify(fit), fit.bottom <= 626 ? 'FITS' : 'CLIPPED — plot bottom is cut off');
