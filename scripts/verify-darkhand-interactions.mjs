import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const origin = process.env.DECK_PREVIEW_URL || 'http://127.0.0.1:8118';
const browser = await chromium.launch({channel:'chrome',headless:true});
try {
 const page = await browser.newPage({viewport:{width:1456,height:900},reducedMotion:'reduce'});
 await page.addInitScript(() => {
   localStorage.setItem('deck-theme','darkhand');
   localStorage.setItem('deck-darkhand-layout',JSON.stringify({stats:'below',details:'bottom',collapsed:true,height:140,width:400}));
 });
 await page.goto(origin);
 await page.locator('tbody tr[role="button"]').first().waitFor();
 await page.locator('tbody tr[role="button"]').first().dblclick();
 await page.locator('.dh-inline-details').waitFor();
 await page.waitForTimeout(250);
 const panel=page.locator('.dh-details-card');
 assert.ok(await panel.evaluate(el=>el.clientHeight >= el.scrollHeight-1),'Bottom overview opens at its full content height');
 assert.ok(await panel.evaluate(el=>el.getBoundingClientRect().height>140),'Saved small height does not clip newly opened details');
 assert.ok(await page.locator('.drawer-footer').evaluate(el=>el.getBoundingClientRect().bottom<=innerHeight-34),'Opening bottom details reveals the action footer above the status bar');
 await page.keyboard.press('Escape');
 assert.ok(await panel.evaluate(el=>el.classList.contains('dh-collapsed')),'Escape collapses the panel');
 assert.equal(await page.locator('.dh-inline-details').count(),0);
 await page.locator('tbody tr[role="button"]').first().dblclick();
 await page.locator('.dh-inline-details').waitFor();
 assert.ok(await panel.evaluate(el=>!el.classList.contains('dh-collapsed')),'Selecting a torrent reopens collapsed details');
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForTimeout(250);
 const handle=page.getByRole('separator',{name:'Resize torrent details'});
 await handle.scrollIntoViewIfNeeded();
 const grip=await handle.boundingBox();
 const dragStart=await panel.evaluate(el=>el.getBoundingClientRect().height);
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2);
 await page.mouse.down();
 await page.mouse.move(grip.x+grip.width/2,grip.y+grip.height/2+35,{steps:5});
 await page.mouse.up();
 await page.waitForTimeout(150);
 assert.ok(await panel.evaluate((el,previous)=>el.getBoundingClientRect().height<previous-20,dragStart),'Manual pointer resizing still works');
 await handle.focus();
 const before=await panel.evaluate(el=>el.getBoundingClientRect().height);
 await page.keyboard.press('ArrowDown');
 await page.waitForFunction(previous=>document.querySelector('.dh-details-card').getBoundingClientRect().height<previous,before);
 assert.ok(await panel.evaluate((el,previous)=>el.getBoundingClientRect().height<previous,before),'Manual keyboard resizing still works');
 await page.getByRole('button',{name:'Collapse torrent details',exact:true}).click();
 await page.locator('tbody tr[role="button"]').first().dblclick();
 await page.locator('.dh-inline-details').waitFor();
 assert.ok(await panel.evaluate(el=>el.classList.contains('dh-auto-fit')),'Reopening the same torrent restores automatic sizing');
 await page.getByRole('button',{name:'Right',exact:true}).click();
 await page.waitForTimeout(200);
 assert.ok(await panel.evaluate(el=>Math.abs(document.documentElement.clientWidth-el.getBoundingClientRect().right)<1),'Open right panel sits flush with the viewport edge');
 await page.getByRole('button',{name:'Collapse torrent details',exact:true}).click();
 assert.ok(await panel.evaluate(el=>Math.abs(document.documentElement.clientWidth-el.getBoundingClientRect().right)<1),'Collapsed right details tab sits flush with the viewport edge');
 await page.getByRole('button',{name:'Open torrent details',exact:true}).click();
 // Switch back to bottom mode where the compact layout still overflows the viewport.
 await page.getByRole('button',{name:'Bottom',exact:true}).click();
 await page.waitForTimeout(200);
 // At a list boundary, vertical wheel input must carry on into the page.
 await page.evaluate(()=>{
   const table=document.querySelector('.table-shell');table.scrollTop=table.scrollHeight;
   const root=document.querySelector('#deluge-deck-root');(root||document.scrollingElement).scrollTop=0;
 });
 await page.locator('.table-shell').hover();
 const scrolled=()=>page.evaluate(()=>document.querySelector('#deluge-deck-root')?.scrollTop||document.scrollingElement.scrollTop);
 const start=await scrolled();
 await page.mouse.wheel(0,350);
 await page.waitForTimeout(300);
 assert.ok(await scrolled()>start,'Wheel at the list boundary continues scrolling the dashboard');
 await page.evaluate(()=>{
   document.querySelector('.dh-details-scroll').scrollTop=99999;
   const root=document.querySelector('#deluge-deck-root');(root||document.scrollingElement).scrollTop=0;
 });
 await page.locator('.dh-details-scroll').hover();
 const detailsStart=await scrolled();
 await page.mouse.wheel(0,350);
 await page.waitForTimeout(300);
 assert.ok(await scrolled()>detailsStart,'Wheel at the details boundary continues scrolling the dashboard');
 assert.equal(await page.locator('.dh-inline-details').evaluate(el=>getComputedStyle(el).overflowY),'visible','Details has no nested vertical scroller');
 await page.screenshot({path:'/tmp/darkhand-interactions.png'});
 console.log('Darkhand: full-height opening, visible footer, Escape, reopening, resizing, right edge and wheel chaining passed.');
} finally {await browser.close();}
