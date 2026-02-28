import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, '..', '.screenshots');

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();

// Desktop full page
await page.setViewport({ width: 1440, height: 900 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
await page.screenshot({ path: path.join(outDir, 'desktop.png'), fullPage: true });
console.log('1/5 desktop homepage');

// Mobile full page
await page.setViewport({ width: 390, height: 844 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 15000 });
await page.screenshot({ path: path.join(outDir, 'mobile.png'), fullPage: true });
console.log('2/5 mobile homepage');

// Bar detail page
await page.setViewport({ width: 1440, height: 900 });
const barLink = await page.$('a[href*="/bars/"]');
if (barLink) {
  const href = await barLink.evaluate(el => el.getAttribute('href'));
  await page.goto('http://localhost:3000' + href, { waitUntil: 'networkidle2', timeout: 15000 });
  await page.screenshot({ path: path.join(outDir, 'bar-detail.png'), fullPage: true });
  console.log('3/5 bar detail');
} else {
  console.log('3/5 skipped — no bar link found');
}

// Search page
await page.goto('http://localhost:3000/search', { waitUntil: 'networkidle2', timeout: 15000 });
await page.screenshot({ path: path.join(outDir, 'search.png'), fullPage: true });
console.log('4/5 search');

// Submit page
await page.goto('http://localhost:3000/submit', { waitUntil: 'networkidle2', timeout: 15000 });
await page.screenshot({ path: path.join(outDir, 'submit.png'), fullPage: true });
console.log('5/5 submit');

await browser.close();
console.log('Done');
