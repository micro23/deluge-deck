import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { THEMES } from '../src/app/themes.js';
import { SPORTS_CLUBS } from '../src/app/sports-clubs.js';
import { contrastRatio } from '../server/theme-contrast.mjs';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo', 'Use the fictional demo library');
const output = process.env.SCREENSHOT_DIR || '/tmp/deck-theme-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel:'chrome', headless:true });
const results = [];
const requested = process.env.DECK_VERIFY_THEMES?.split(',');
if (requested) assert.ok(requested.every(id => THEMES.some(([theme]) => theme === id)), 'Unknown verification theme');
try {
  for (const [theme] of THEMES) {
    if (requested && !requested.includes(theme)) continue;
    const page = await browser.newPage({ reducedMotion:'reduce' });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(t => localStorage.setItem('deck-theme', t), theme);
    for (const [width,height] of [[1456,900],[1200,900],[820,1000],[390,844],[320,740]]) {
      await page.setViewportSize({width,height});
      await page.goto(origin);
      await page.locator(theme === 'darkhand' ? '.dh-stat strong' : '.stat-card strong').first().waitFor();
      await page.waitForFunction(selector => document.querySelector(selector)?.textContent !== '0', theme === 'darkhand' ? '.dh-stat strong' : '.stat-card strong');
      await page.evaluate(() => document.fonts.ready);
      // Auto sizing runs after font loading and ResizeObserver delivery.
      await page.waitForTimeout(250);
      if (SPORTS_CLUBS[theme]) {
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${theme} layout fits the viewport`);
        const masthead = page.locator(theme === 'mets' ? '.mets-masthead' : theme === 'yankees' ? '.yankees-masthead' : '.sports-masthead');
        assert.equal(await masthead.isVisible(), true);
        const heritage = await page.locator('.sports-facts').evaluate(el => {
          const hex = color => '#' + color.match(/\d+/g).slice(0,3).map(v => Number(v).toString(16).padStart(2,'0')).join('');
          return { background:hex(getComputedStyle(el).backgroundColor), text:[...el.querySelectorAll('strong,small,span')].filter(node => node.getBoundingClientRect().width).map(node => ({text:node.textContent,color:hex(getComputedStyle(node).color),fits:node.scrollWidth <= node.clientWidth + 1})) };
        });
        assert.ok(heritage.text.every(sample => sample.fits && contrastRatio(sample.color,heritage.background) >= 7), `${theme} ${width}: heritage text meets 7:1 and fits`);
        assert.match(await masthead.textContent(), new RegExp(String(SPORTS_CLUBS[theme].opened)));
        if (width > 760) {
          const icons = await page.locator('.sports-stat-icon').evaluateAll(nodes => nodes.map(node => {
            const box = node.getBoundingClientRect(),badge=node.parentElement.getBoundingClientRect();
            return {width:box.width,height:box.height,fits:box.left>=badge.left && box.right<=badge.right && box.top>=badge.top && box.bottom<=badge.bottom,color:getComputedStyle(node).color,background:getComputedStyle(node.parentElement).backgroundColor};
          }));
          assert.equal(icons.length,4);
          assert.ok(icons.every(icon => icon.width >= 28 && icon.height >= 28 && icon.fits), `${theme} icons are visible and contained`);
          const hex = color => '#' + color.match(/\d+/g).slice(0,3).map(v => Number(v).toString(16).padStart(2,'0')).join('');
          assert.ok(icons.every(icon => contrastRatio(hex(icon.color),hex(icon.background)) >= 3), `${theme} icon contrast meets 3:1`);
        }
        if (width > 760) assert.ok(await masthead.evaluate(el => {
          const box = el.getBoundingClientRect();
          return [...el.children].filter(child => child.tagName !== 'svg').every(child => {
            const rect = child.getBoundingClientRect();
            return rect.left >= box.left && rect.right <= box.right && rect.top >= box.top && rect.bottom <= box.bottom;
          });
        }), `${theme} masthead text fits without clipping`);
      }
      const cards = await page.locator('.stat-card').evaluateAll((nodes, isNewSports) => nodes.map(card => {
        const box = card.getBoundingClientRect();
        const text = card.children[1];
        const logos = [...card.querySelectorAll('.theme-detail')].map(n => n.getBoundingClientRect());
        return {width:box.width, textFits:[...text.children].every(el => {
          const r=el.getBoundingClientRect();
          return !r.width || (r.left >= box.left && r.right <= box.right && el.scrollWidth <= el.clientWidth+1 && (!isNewSports || (r.top >= box.top + 3 && r.bottom <= box.bottom - 3)));
        }),
          seals:logos.length === 2 && logos.every(r => r.left >= box.left && r.right <= box.right && r.bottom <= box.bottom),
          matched:logos.length === 2 && Math.abs(logos[0].width-logos[1].width)<1,
          font:parseFloat(getComputedStyle(text.querySelector('span')).fontSize)};
      }), Boolean(SPORTS_CLUBS[theme]?.material));
      if (theme === 'darkhand') {
        assert.equal(await page.locator('.dh-stat').count(), 6);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      }
      // Matrix and USA keep artwork in the masthead and telemetry cards free of seals.
      assert.ok(cards.every(c => c.textFits && (['matrix', 'independence'].includes(theme) || (c.seals && c.matched))), `${theme} ${width}: ${JSON.stringify(cards)}`);
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
