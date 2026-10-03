import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
assert.equal((await fetch(`${origin}/api/health`).then(r => r.json())).mode, 'demo', 'Use the fictional demo library');
const output = process.env.SCREENSHOT_DIR || '/tmp/deck-darkhand-review';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem('deck-theme', 'darkhand');
    localStorage.setItem('deck-sidebar-collapsed', 'false');
    localStorage.removeItem('deck-darkhand-layout');
  });
  for (const width of [2048, 1456, 1200, 820, 390, 320]) {
    await page.setViewportSize({ width, height: 1057 });
    await page.goto(origin);
    await page.locator('.dh-stat').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    const desktop = width > 760;
    for (const stats of ['above', 'below']) {
      await page.getByRole('group', { name: 'Stats placement' }).getByRole('button', { name: stats[0].toUpperCase() + stats.slice(1), exact: true }).click();
      for (const details of desktop ? ['right', 'bottom'] : ['bottom']) {
        if (desktop) await page.getByRole('group', { name: 'Details placement' }).getByRole('button', { name: details[0].toUpperCase() + details.slice(1), exact: true }).click();
        await page.waitForTimeout(150);
        const geometry = await page.evaluate(() => {
          const rect = selector => {
            const r = document.querySelector(selector)?.getBoundingClientRect();
            return r && { x:r.x, y:r.y, right:r.right, bottom:r.bottom, width:r.width };
          };
          const bar = document.querySelector('.topbar');
          const controls = [...bar.querySelectorAll(':scope>.dh-switches,:scope>.search-wrap,:scope>.top-actions')].map(el => el.getBoundingClientRect());
          const overlaps = controls.some((a,i) => controls.slice(i+1).some(b => a.left < b.right-1 && a.right > b.left+1 && a.top < b.bottom-1 && a.bottom > b.top+1));
          const counts = [...document.querySelectorAll('.sidebar>nav .nav-item b')].map(el => el.getBoundingClientRect().right);
          const sidebar = rect('.sidebar');
          return { overflow:document.documentElement.scrollWidth > innerWidth+1, overlaps, bar:rect('.topbar'), list:rect('.table-shell') || rect('.mobile-transfers'), overview:rect('.dh-overview'), details:rect('.dh-details-card'), counts, sidebar };
        });
        assert.ok(!geometry.overflow, `${width} ${stats}/${details}: page overflow`);
        assert.ok(!geometry.overlaps, `${width} ${stats}/${details}: toolbar overlap`);
        assert.ok(geometry.list.y >= geometry.bar.bottom, 'Panels follow the toolbar');
        assert.ok(stats === 'above' ? geometry.overview.bottom <= geometry.list.y + 1 : geometry.list.bottom <= geometry.overview.y + 1, 'Stats placement changes only the panel order');
        if (desktop) {
          assert.ok(geometry.counts.every(x => Math.abs(x - geometry.counts[0]) < 1 && x <= geometry.sidebar.right), 'Sidebar counts align inside the panel');
          assert.ok(details === 'right' && width > 1100 ? geometry.details.x >= geometry.list.right : geometry.details.y >= Math.max(geometry.overview.bottom,geometry.list.bottom), 'Details fit beside or below the content');
        }
        await page.screenshot({ path: `${output}/${width}-${stats}-${details}.png`, fullPage:true });
      }
    }
    if (desktop) {
      await page.getByRole('button', { name: 'Collapse navigation', exact:true }).click();
      await page.waitForFunction(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().width) === 72);
      assert.ok(await page.locator('.sidebar>nav .nav-item span').first().isHidden());
      await page.getByRole('button', { name: 'Expand navigation', exact:true }).click();
      await page.waitForFunction(() => Math.round(document.querySelector('.sidebar').getBoundingClientRect().width) === 211);
      for (const details of ['right', 'bottom']) {
        await page.getByRole('group', { name:'Details placement' }).getByRole('button', { name:details[0].toUpperCase() + details.slice(1), exact:true }).click();
        await page.getByRole('button', { name:'Collapse torrent details', exact:true }).click();
        await page.getByRole('button', { name:'Open torrent details', exact:true }).click();
        const handle = page.getByRole('separator', { name:'Resize torrent details', exact:true });
        await handle.waitFor();
        assert.equal(await handle.getAttribute('aria-orientation'), details === 'right' && width > 1100 ? 'vertical' : 'horizontal');
        const before = await handle.getAttribute('aria-valuenow');
        await handle.focus();
        await page.keyboard.press(details === 'right' && width > 1100 ? 'ArrowLeft' : 'ArrowUp');
        await page.waitForFunction(value => document.querySelector('.dh-details-resize').getAttribute('aria-valuenow') !== value, before);
      }
    }
    console.log(`Verified Darkhand ${width}: placements, toolbar, sidebar and details collapse`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
