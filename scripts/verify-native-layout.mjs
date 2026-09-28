import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { createNativeLayoutFixture } from '../server/native-layout-fixture.mjs';
const webRoot = process.env.DELUGE_WEB_ROOT;
if (!webRoot) throw new Error('Set DELUGE_WEB_ROOT to an installed Deluge ui/web directory. Run npm run build first.');
const server = await createNativeLayoutFixture(webRoot, process.env.AUTOADD_JS_DIR);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
page.setDefaultTimeout(8000);
try {
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.deluge?.preferences?.rendered);
  let count = 0;
  for (const [width, height] of [[1280,900],[768,700],[390,844],[844,390]]) {
    await page.setViewportSize({ width, height });
    // Ext.Window schedules a second layout after showing/resizing.
    await page.waitForTimeout(180);
    for (const name of await page.evaluate(() => Object.keys(deluge.preferences.pages))) {
      await page.evaluate(name => deluge.preferences.selectPage(name), name);
      const result = await page.evaluate(() => {
        const pref = deluge.preferences;
        const win = pref.el.dom.getBoundingClientRect();
        const panel = pref.configPanel.el.dom.getBoundingClientRect();
        const active = pref.pages[pref.currentPage].el.dom.getBoundingClientRect();
        const footer = [...pref.footer.dom.querySelectorAll('button')].map(button => {
          const r = button.getBoundingClientRect();
          return r.width > 0 && r.left >= win.left && r.right <= win.right + 1 && r.bottom <= innerHeight;
        });
        const clipped = [...pref.pages[pref.currentPage].el.dom.querySelectorAll('.x-fieldset')].some(field => field.scrollWidth > field.clientWidth + 2);
        return { within:win.left >= 0 && win.top >= 0 && win.right <= innerWidth + 1 && win.bottom <= innerHeight + 1,
          panel:panel.width > 300 && panel.left >= win.left && panel.right <= win.right + 1,
          active:active.width > 0 && active.left < panel.right && active.right > panel.left,
          footer:footer.length === 3 && footer.every(Boolean), clipped };
      });
      assert.ok(result.within && result.panel && result.active && result.footer, `${width} ${name}: ${JSON.stringify(result)}`);
      // Legacy plugins may intentionally scroll tables, but form cards must fit.
      assert.equal(result.clipped, false, `${width} ${name}: fieldset clips controls`);
      if (process.env.SCREENSHOT_DIR) await page.screenshot({path:`${process.env.SCREENSHOT_DIR}/${width}-${name}.png`});
      count++;
    }
  }
  await page.setViewportSize({ width:1280,height:900 });
  await page.waitForTimeout(180);
  await page.evaluate(() => deluge.preferences.selectPage('Encryption'));
  const trigger = page.locator('[data-deluge-deck-native-window] .x-form-arrow-trigger').first();
  await trigger.click();
  if(process.env.SCREENSHOT_DIR) await page.screenshot({path:process.env.SCREENSHOT_DIR+'/dropdown.png'});
  const option = page.locator('.x-combo-list:visible .x-combo-list-item').last();
  await option.click();
  assert.equal(await page.evaluate(() => deluge.preferences.isVisible()), true, 'Selecting a body-level dropdown must not dismiss Preferences');
  await page.evaluate(() => deluge.preferences.selectPage('Plugins'));
  await page.getByRole('button', { name:'Install', exact:true }).click();
  await page.getByRole('button', { name:'Browse...', exact:true }).waitFor({state:'visible'});
  await page.locator('.x-window:visible').last().locator('.x-tool-close').click();
  await page.getByRole('button', { name:'Close', exact:true }).click();
  assert.equal(await page.evaluate(() => deluge.preferences.isVisible()), false);
  await page.evaluate(() => window.__DELUGE_DECK_SHOW_NATIVE_PREFERENCES__());
  assert.equal(await page.evaluate(() => deluge.preferences.isVisible()), true);
  assert.deepEqual(errors, []);
  console.log(`Verified ${count} real Deluge settings layouts, dropdown selection, plugin dialog, close and reopen.`);
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
