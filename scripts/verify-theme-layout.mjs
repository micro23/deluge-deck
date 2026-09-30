import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo', 'Use the fictional demo library');
const output = process.env.SCREENSHOT_DIR || '/tmp/deck-theme-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel:'chrome', headless:true });
const results = [];
try {
  for (const [theme] of THEMES) {
    const page = await browser.newPage({ reducedMotion:'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => localStorage.setItem('deck-theme', t), theme);
    for (const [width,height] of [[1456,900],[1200,900],[820,1000],[390,844],[320,740]]) {
      await page.setViewportSize({width,height});
      await page.goto(origin);
      await page.waitForFunction(() => document.querySelector('.stat-card strong')?.textContent !== '0');
      await page.evaluate(() => document.fonts.ready);
      // Auto sizing runs after font loading and ResizeObserver delivery.
      await page.waitForTimeout(250);
      const cards = await page.locator('.stat-card').evaluateAll(nodes => nodes.map(card => {
        const box = card.getBoundingClientRect();
        const text = card.children[1];
        const logos = [...card.querySelectorAll('.theme-detail')].map(n => n.getBoundingClientRect());
        return {width:box.width, textFits:[...text.children].every(el => {
          const r=el.getBoundingClientRect();
          return !r.width || (r.left >= box.left && r.right <= box.right && el.scrollWidth <= el.clientWidth+1);
        }),
          seals:logos.length === 2 && logos.every(r => r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom),
          matched:logos.length === 2 && Math.abs(logos[0].width-logos[1].width)<1,
          font:parseFloat(getComputedStyle(text.querySelector('span')).fontSize)};
      }));
      assert.ok(cards.every(c => c.textFits && c.seals && c.matched), `${theme} ${width}: ${JSON.stringify(cards)}`);
      if (width > 760) {
        for (const handle of await page.locator('.column-resize-handle').all()) {
          await handle.scrollIntoViewIfNeeded();
          await handle.evaluate(el => {
            const shell=el.closest('.table-shell'),r=el.getBoundingClientRect(),s=shell.getBoundingClientRect();
            shell.scrollLeft += (r.left+r.right-s.left-s.right)/2;
          });
          const styles = await handle.evaluate(el => ({opacity:getComputedStyle(el).opacity, color:getComputedStyle(el,'::after').backgroundColor, width:el.getBoundingClientRect().width}));
          assert.equal(styles.opacity,'1');
          assert.notEqual(styles.color,'rgba(0, 0, 0, 0)');
          assert.ok(styles.width >= 12);
          const before = Number(await handle.getAttribute('aria-valuenow'));
          const min=Number(await handle.getAttribute('aria-valuemin')),max=Number(await handle.getAttribute('aria-valuemax'));
          const direction=before < (min+max)/2 ? 1 : -1;
          const box = await handle.boundingBox();
          await page.mouse.move(box.x+box.width/2,box.y+box.height/2);
          await page.mouse.down(); await page.mouse.move(box.x+box.width/2+35*direction,box.y+box.height/2,{steps:5}); await page.mouse.up();
          await page.waitForFunction(({before,label,direction}) => (Number(document.querySelector(`[aria-label="${label}"]`).getAttribute('aria-valuenow'))-before)*direction > 10, {before,direction,label:await handle.getAttribute('aria-label')});
          await handle.focus(); const resized = Number(await handle.getAttribute('aria-valuenow'));
          await page.keyboard.press(resized > min ? 'ArrowLeft' : 'ArrowRight');
          await page.waitForFunction(({resized,label}) => Number(document.querySelector(`[aria-label="${label}"]`).getAttribute('aria-valuenow')) !== resized, {resized,label:await handle.getAttribute('aria-label')});
          await page.keyboard.press('Home');
        }
        await page.locator('.table-shell').evaluate(el => el.scrollLeft=0);
      }
      const stress = await page.locator('.stat-card').evaluateAll(cards => cards.slice(0,2).map(card => {
        const el=card.querySelector('strong'),original=el.textContent; el.textContent='999.9 MB/s';
        const r=el.getBoundingClientRect(),box=card.getBoundingClientRect();
        const fits=r.left>=box.left && r.right<=box.right && el.scrollWidth<=el.clientWidth+1;
        el.textContent=original; return fits;
      }));
      assert.ok(stress.every(Boolean), `${theme} ${width}: long speed values overflow`);
      await page.screenshot({path:`${output}/${theme}-${width}.png`});
      // Save foreground samples and a matching background render for contrast QA.
      const samples = await page.evaluate(() => [...document.querySelectorAll('.stat-card span,.stat-card small,.table-shell th,.state-badge,.torrent-name strong,.mobile-transfer-name')].filter(el => {
        const r=el.getBoundingClientRect();return r.width && r.height && r.x>=0 && r.right<=innerWidth && r.bottom<=innerHeight;
      }).map(el => {const r=el.getBoundingClientRect();return {text:el.textContent,color:getComputedStyle(el).color,x:r.x,y:r.y,w:r.width,h:r.height};}));
      await page.addStyleTag({content:'.stat-card span,.stat-card small,.table-shell th,.state-badge,.torrent-name strong,.mobile-transfer-name { color:transparent!important; text-shadow:none!important; }'});
      await page.screenshot({path:`${output}/${theme}-${width}-background.png`});
      results.push({theme,width,cards,samples});
    }
    assert.deepEqual(errors,[]); await page.close();
    console.log(`Verified ${theme}: five sizes, every column resized by pointer and keyboard`);
  }
  await writeFile(`${output}/audit.json`,JSON.stringify(results));
} finally {await browser.close();}
