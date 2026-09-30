import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo');
const fixture = await fetch(`${origin}/api/torrents`).then(r => r.json());
const browser = await chromium.launch({ channel:'chrome', headless:true });
const geometry = page => page.locator('.sidebar').evaluate(sidebar => {
  const selectors = ['.sidebar-command-row','.add-button','.nav-label','nav .nav-item','nav .nav-item svg','nav .nav-item span','.sidebar-bottom','.sidebar-bottom .nav-item','.sidebar-toggle'];
  return [sidebar,...selectors.map(s => sidebar.querySelector(s))].map(el => {
    const s=getComputedStyle(el),r=el.getBoundingClientRect();
    return [r.width,r.height,s.padding,s.margin,s.gap,s.display,s.fontSize];
  });
});
try {
  for (const width of [1456,1000,820,390]) {
    const measurements = [];
    for (const theme of ['dark','independence']) {
      const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
      await page.addInitScript(theme => {
        localStorage.setItem('deck-theme',theme);
        if (localStorage.getItem('deck-sidebar-collapsed') === null) localStorage.setItem('deck-sidebar-collapsed','false');
      },theme);
      await page.goto(origin);
      await page.locator('.app-shell').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      const expanded = await geometry(page);
      if (width > 760) {
        assert.equal(expanded[0][0],width>1100?250:220);
        await page.getByRole('button',{name:'Collapse navigation',exact:true}).click();
        await page.waitForTimeout(300);
        const collapsed=await geometry(page);
        assert.equal(collapsed[0][0],120);
        assert.equal(collapsed[6][5],'none');
        await page.getByRole('button',{name:'Expand navigation',exact:true}).click();
        await page.waitForTimeout(300);
        assert.deepEqual(await geometry(page),expanded);
        await page.reload();
        await page.locator('.app-shell').waitFor();
        assert.equal(await page.getByRole('button',{name:'Collapse navigation',exact:true}).getAttribute('aria-expanded'),'true');
        measurements.push([expanded,collapsed]);
      } else measurements.push([expanded]);
      if(theme==='independence' && width===1456) await page.screenshot({path:'/tmp/independence-fixed.png'});
      await page.close();
    }
    assert.deepEqual(measurements[1],measurements[0],`Sidebar geometry differs at ${width}px`);
    console.log(`Sidebar matches Midnight at ${width}px, including expand/collapse where available`);
  }
  const page = await browser.newPage({viewport:{width:1456,height:900},reducedMotion:'reduce'});
  await page.addInitScript(() => localStorage.setItem('deck-theme','independence'));
  let progress=0;
  await page.route('**/api/torrents',route => {
    const data=structuredClone(fixture);
    for(const torrent of Object.values(data.torrents)) torrent.progress=progress;
    return route.fulfill({json:data});
  });
  for(const value of [0,1,25,50,75,99,100]) {
    progress=value;
    await page.goto(origin);
    const meter=page.locator('.table-shell .independence-flag').first();
    await meter.waitFor({state:'visible'});
    assert.equal(await meter.locator('clipPath rect').getAttribute('width'),String(190*value/100));
    assert.equal(await meter.locator('use').count(),50);
    assert.equal(await meter.locator('g > rect').count(),9);
    assert.equal(await meter.evaluate(el => getComputedStyle(el.previousElementSibling).display),'none');
    assert.equal(await meter.evaluate(el => el.closest('.progress-wrap').querySelector(':scope > span').textContent),`${value}%`);
    assert.equal(await meter.evaluate(el => el.getBoundingClientRect().height),20);
  }
  await page.screenshot({path:'/tmp/independence-flag-full.png'});
  await page.setViewportSize({width:390,height:844});
  await page.reload();
  await page.locator('.mobile-transfer .independence-flag').first().waitFor({state:'visible'});
  console.log('Flag reveals actual progress from 0–100, with 13 stripes and 50 stars; desktop and phone verified');
} finally { await browser.close(); }
