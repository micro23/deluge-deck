// Run against the isolated hosted layout fixture after building the plugin.
// Compare CSS registration with the self-contained script used by Deluge 2.2.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';

const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url)));
const css = await readFile(new URL(`../plugin/deluge_deck/data/deluge-deck-${version}.css`, import.meta.url), 'utf8');
assert.ok(css.length < 1_000_000, 'Optional CSS must not duplicate the multi-megabyte artwork payload');
const origin = process.env.DECK_HOSTED_FIXTURE_URL || 'http://127.0.0.1:8130';
await fetch(`${origin}/json`, { method:'POST', body:JSON.stringify({method:'auth.login'}) });
const browser = await chromium.launch({ channel:'chrome', headless:true });
try {
  for (const [theme] of THEMES) {
    for (const width of [1456,390]) {
      const page = await browser.newPage({ viewport:{width,height:900}, reducedMotion:'reduce' });
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(value => localStorage.setItem('deck-theme', value), theme);
      await page.goto(origin);
      await page.locator('.stat-card').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => {
        Object.defineProperty(document,'hidden',{value:true,configurable:true});
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.addStyleTag({content:'*,*::before,*::after { animation:none!important; transition:none!important; caret-color:transparent!important; }'});
      await page.waitForTimeout(500);
      await page.evaluate(() => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime=0; }));
      const snapshot = () => page.evaluate(() => [...document.querySelectorAll('.app-shell,.app-shell *')].map(el => {
        const r=el.getBoundingClientRect(), s=getComputedStyle(el);
        return {tag:el.tagName, box:[r.x,r.y,r.width,r.height].map(v=>v.toFixed(3)),
          style:['color','background-color','background-image','font-family','font-size','font-weight',
            'border-color','border-width','box-shadow','opacity','transform'].map(key=>s.getPropertyValue(key))};
      }));
      const originalState = await snapshot();
      const original = await page.screenshot();
      const injected = await page.locator('style[data-deluge-deck="true"]').textContent();
      assert.ok(injected.endsWith(css), 'Optional stylesheet rules must match the canonical injected rules');
      assert.ok(injected.includes('data:image/'), 'The canonical style script must retain the artwork');
      // Both orders are used by Deluge variants. Neither may change rendering.
      for (const placement of ['before','after']) {
        await page.evaluate(({css,placement}) => {
          const canonical = document.querySelector('style[data-deluge-deck="true"]');
          const extra = document.createElement('style');
          extra.id='package-css-check'; extra.textContent=css;
          canonical[placement](extra);
        }, {css,placement});
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(250);
        await page.evaluate(() => document.getAnimations().forEach(animation => { animation.pause(); animation.currentTime=0; }));
        assert.deepEqual(await snapshot(),originalState, `${theme} ${width}: CSS ${placement} changed computed styles or geometry`);
        const shot = await page.screenshot();
        const difference = await page.evaluate(async ({before,after}) => {
          const pixels = async base64 => {
            const image = new Image(); image.src=`data:image/png;base64,${base64}`;
            await image.decode();
            const canvas=document.createElement('canvas');
            canvas.width=image.width; canvas.height=image.height;
            const context=canvas.getContext('2d'); context.drawImage(image,0,0);
            return context.getImageData(0,0,image.width,image.height).data;
          };
          const a=await pixels(before), b=await pixels(after);
          if (a.length!==b.length) return {max:Infinity,changedPixels:Infinity,mean:Infinity};
          let max=0, sum=0, changedPixels=0;
          for (let i=0;i<a.length;i+=4) {
            let pixelDifference=0;
            for (let channel=0;channel<4;channel++) {
              const delta=Math.abs(a[i+channel]-b[i+channel]);
              pixelDifference=Math.max(pixelDifference,delta); sum+=delta;
            }
            max=Math.max(max,pixelDifference);
            if (pixelDifference>2) changedPixels++;
          }
          return {max,changedPixels,mean:sum/a.length};
        }, {before:original.toString('base64'),after:shot.toString('base64')});
        if (difference.changedPixels > 100 || difference.mean > .002) {
          const {writeFile}=await import('node:fs/promises');
          await writeFile(`/tmp/package-${theme}-before.png`,original);
          await writeFile(`/tmp/package-${theme}-after.png`,shot);
        }
        // Chromium blur/glow compositing occasionally rounds isolated pixels.
        // Computed styles and geometry must match exactly; permit only tiny
        // antialiasing differences at rounded edges in the pixel comparison.
        assert.ok(difference.changedPixels <= 100 && difference.mean <= .002,
          `${theme} ${width}: CSS ${placement} changed rendering (${JSON.stringify(difference)})`);
        await page.locator('#package-css-check').evaluate(el => el.remove());
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(`Matching rendering: ${theme}, desktop and phone, with CSS before/after the style script`);
  }
} finally { await browser.close(); }
