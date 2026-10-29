import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
  const page = await browser.newPage({viewport:{width:1456,height:1000}});
  await page.goto(process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118');
  await page.locator('.auto-sized-table').waitFor();
  assert.equal(await page.locator('th[data-column="uploaded"]').count(),0,'new column is optional');
  await page.locator('.column-menu-trigger').click();
  await page.getByRole('checkbox',{name:'Uploaded',exact:true}).check();
  await page.getByRole('button',{name:'Done',exact:true}).click();
  const header=page.locator('th[data-column="uploaded"]');
  await header.waitFor();
  await header.getByRole('button').click();
  await page.waitForTimeout(150);
  assert.match(await page.locator('td[data-column="uploaded"]').first().innerText(),/^0\s*B$/);
  await header.getByRole('button').click();
  await page.waitForTimeout(150);
  assert.match(await page.locator('.auto-sized-table tbody tr').first().innerText(),/Ambient Worlds/,'sort uses total uploaded bytes');
  await page.reload();
  await page.locator('th[data-column="uploaded"]').waitFor();
  const overflow=await page.locator('.table-shell').evaluate(e=>e.scrollWidth-e.clientWidth);
  assert.ok(overflow<=1,'enabled Uploaded column still fits the pane');
  await page.screenshot({path:'/tmp/webui-uploaded-column.png'});
  console.log('PASS: Uploaded can be enabled, sorts numerically, survives reload, and fits the pane.');
} finally { await browser.close(); }
