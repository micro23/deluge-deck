import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {THEMES} from '../src/app/themes.js';
const base=process.env.DECK_PREVIEW_URL||'http://127.0.0.1:8118';
assert.equal((await fetch(base+'/api/health').then(r=>r.json())).mode,'demo');
const browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{});
let count=0;
try{
 const page=await browser.newPage({reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base,{waitUntil:'domcontentloaded'});
 for(const width of [1280,768,390,320]){
  await page.setViewportSize({width,height:900});
  for(const [theme] of THEMES){
   console.log(`Checking ${theme} ${width}`);
   await page.evaluate(theme=>localStorage.setItem('deck-theme',theme),theme);
   await page.reload({waitUntil:'domcontentloaded'});
   await page.locator('button[aria-label="Open Deluge Preferences"]:visible,button[aria-label="Preferences"]:visible').first().click();
   await page.getByLabel('Download location',{exact:true}).waitFor();
   await page.waitForTimeout(220);
   const bad=await page.locator('.preferences-modal').evaluate(modal=>{
    const outer=modal.getBoundingClientRect();
    return [modal,...modal.querySelectorAll('.preferences-card,input,select,button,.path-check')].filter(el=>{
     const r=el.getBoundingClientRect();return r.width && (r.left<outer.left-1||r.right>outer.right+1);
    }).map(el=>el.getAttribute('aria-label')||el.className);
   });
   assert.deepEqual(bad,[],`${theme} at ${width}: controls escape dialog`);
   for(const name of ['Save paths','Save network','Save proxy','Save cache','Open native Deluge Preferences']){
    const button=name.startsWith('Open native') ? page.getByRole('button',{name,exact:true}) : page.locator('.preferences-modal button').filter({hasText:name});await button.scrollIntoViewIfNeeded();
    const visible=await button.evaluate(el=>{const r=el.getBoundingClientRect();const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return el===hit||el.contains(hit);});
    assert.equal(visible,true,`${theme} ${width}: ${name} covered or clipped`);
   }
   await page.getByRole('button',{name:'Close preferences',exact:true}).click();
   await page.getByRole('button',{name:'Open global session controls',exact:true}).click();
   const box=await page.locator('.global-popover').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=width+1,`${theme} ${width}: global controls bounds`);
   await page.keyboard.press('Escape');count++;
  }
  console.log(`Settings and global controls fit all ${THEMES.length} themes at ${width}px`);
 }
 assert.deepEqual(errors,[]);console.log(`Verified ${count} theme/viewport settings layouts with reachable save actions.`);
}finally{await browser.close();}
