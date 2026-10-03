import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';

// Capture only the fictional demo library; never package a user's torrent list.
const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
const health = await fetch(`${origin}/api/health`).then(response => response.json());
if (health.mode !== 'demo') throw new Error('Theme previews require a demo server (npm run demo).');
const destination = new URL('../src/assets/theme-previews/', import.meta.url);
const requested = process.env.DECK_PREVIEW_THEMES?.split(',');
if (requested?.some(id => !THEMES.some(([theme]) => theme === id))) throw new Error('Unknown preview theme.');
await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const encoder = await browser.newPage();
  for (const [theme] of THEMES) {
    if (requested && !requested.includes(theme)) continue;
    const page = await browser.newPage({ viewport: { width: 1456, height: 900 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    await page.addInitScript(value => localStorage.setItem('deck-theme', value), theme);
    await page.goto(origin, { waitUntil: 'networkidle' });
    await page.locator('.table-shell').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const screenshot = await page.screenshot();
    const encoded = await encoder.evaluate(async base64 => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = Math.round(640 * image.height / image.width);
      const context = canvas.getContext('2d');
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return {
        original: canvas.toDataURL('image/webp', .9).split(',')[1],
        optimized: canvas.toDataURL('image/webp', .82).split(',')[1],
      };
    }, screenshot.toString('base64'));
    await writeFile(new URL(`${theme}.webp`, destination), Buffer.from(encoded.original, 'base64'));
    await writeFile(new URL(`${theme}-optimized.webp`, destination), Buffer.from(encoded.optimized, 'base64'));
    await page.close();
    console.log(`Captured ${theme}`);
  }
} finally {
  await browser.close();
}
