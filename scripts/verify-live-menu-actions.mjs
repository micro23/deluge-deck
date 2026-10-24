// Use ONLY an empty, disposable Deluge daemon. No production credentials or
// paths belong in this script. The caller supplies the locally generated torrent.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
const base = process.env.DECK_TEST_URL;
const password = process.env.DELUGE_TEST_PASSWORD;
const torrentFile = process.env.DECK_TEST_TORRENT;
if (process.env.DECK_ALLOW_TEST_WRITES !== '1' || !base || !password || !torrentFile)
  throw new Error('Set DECK_ALLOW_TEST_WRITES=1, DECK_TEST_URL, DELUGE_TEST_PASSWORD and DECK_TEST_TORRENT for an empty disposable daemon.');
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Test URL must be loopback.');
const hosted = process.env.DECK_TEST_HOSTED === '1';
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {});
const page = await browser.newPage({viewport:{width:1280,height:900}});
page.setDefaultTimeout(10000);
const errors=[];
page.on('pageerror', error=>errors.push(error.message));
const rpc = async (method, params=[]) => {
  const response=await page.request.post(`${base}${hosted?'/json':'/api/rpc'}`, {data:{method,params,id:Date.now()}});
  const value=await response.json();
  if (!response.ok() || value.error) throw new Error(value.error?.message || value.error || `HTTP ${response.status()}`);
  return value.result;
};
const waitFor = async (read, predicate, label) => {
  for (let i=0;i<50;i++) { const value=await read(); if(predicate(value))return value; await page.waitForTimeout(100); }
  throw new Error(`Daemon did not confirm ${label}`);
};
let original;
let owned=[];
try {
  if (hosted) {
    await rpc('auth.login',[password]);
    const hosts=await rpc('web.get_hosts'); await rpc('web.connect',[hosts[0][0]]);
  } else {
    const response=await page.request.post(`${base}/api/session/connect`,{data:{url:process.env.DELUGE_TEST_URL,password}});
    assert.equal((await response.json()).connected,true);
  }
  const feed=await rpc('web.update_ui',[['name'],{}]);
  assert.equal(Object.keys(feed.torrents).length,0,'Refusing to run against a nonempty daemon');
  original=await rpc('core.get_config');
  await page.goto(base);
  await page.evaluate(()=>localStorage.setItem('deck-theme','ocean'));
  await page.reload();
  if (hosted) {
    const prompt = page.locator('.x-window').filter({hasText:'Change Default Password'});
    await prompt.waitFor({timeout:2000}).catch(()=>{});
    if (await prompt.isVisible()) await prompt.getByRole('button',{name:'No',exact:true}).click();
  }
  await page.getByRole('button',{name:'Open Deluge Preferences',exact:true}).click();
  await page.getByLabel('Download location',{exact:true}).fill('/downloads/menu-check');
  await page.getByLabel('Completed download location',{exact:true}).fill('/downloads/menu-check/completed');
  await page.getByRole('button',{name:'Save paths',exact:true}).click();
  await page.getByText('Paths saved.',{exact:true}).waitFor();
  assert.equal((await rpc('core.get_config')).download_location,'/downloads/menu-check');
  await page.getByLabel('Listen port',{exact:true}).fill('50123');
  await page.getByLabel('Randomize port on startup',{exact:true}).uncheck();
  await page.getByRole('button',{name:'Save network',exact:true}).click();
  await page.getByText('Network settings saved.',{exact:true}).waitFor();
  assert.deepEqual((await rpc('core.get_config')).listen_ports,[50123,50123]);
  await page.getByLabel('Proxy host',{exact:true}).fill('proxy.invalid');
  await page.getByRole('button',{name:'Save proxy',exact:true}).click();
  await page.getByText('Proxy settings saved.',{exact:true}).waitFor();
  assert.equal((await rpc('core.get_config')).proxy.hostname,'proxy.invalid');
  await page.getByLabel('Cache size in 16 KiB blocks',{exact:true}).fill('1024');
  await page.getByLabel('Cache expiry in seconds',{exact:true}).fill('90');
  await page.getByRole('button',{name:'Save cache',exact:true}).click();
  await page.getByText('Cache settings saved.',{exact:true}).waitFor();
  assert.equal((await rpc('core.get_config')).cache_size,1024);
  assert.equal((await rpc('core.get_config')).cache_expiry,90);
  await page.getByRole('button',{name:'Close preferences',exact:true}).click();
  await page.getByRole('button',{name:'Open global session controls',exact:true}).click();
  const limits=page.locator('.limit-form input');
  for(const [i,value] of ['1234','456','123'].entries())await limits.nth(i).fill(value);
  await page.getByRole('button',{name:'Save limits',exact:true}).click();
  await page.getByText('Global limits saved.',{exact:true}).waitFor();
  const limited=await rpc('core.get_config');
  assert.deepEqual([limited.max_download_speed,limited.max_upload_speed,limited.max_connections_global],[1234,456,123]);
  await page.keyboard.press('Escape');
  await page.getByRole('button',{name:'Add torrent',exact:true}).first().click();
  await page.locator('input[type="file"]').setInputFiles(torrentFile);
  await page.getByLabel('Download to',{exact:true}).fill('/downloads/menu-check');
  await page.locator('label.toggle-row').filter({hasText:'Add paused'}).click();
  await page.getByRole('button',{name:'Add to Deluge',exact:true}).click();
  await page.getByRole('button',{name:'Actions for fixture.txt',exact:true}).waitFor();
  const added=await rpc('web.update_ui',[['name','state'],{}]);
  owned=Object.keys(added.torrents); assert.equal(owned.length,1);
  const hash=owned[0];
  const status=keys=>rpc('web.get_torrent_status',[hash,keys]);
  const action=async name=>{await page.getByRole('button',{name:/^Actions for /}).first().click();await page.locator('.context-menu').getByRole('button',{name,exact:true}).click();};
  await action('View details');
  await page.getByLabel(/Auto-managed queue/).uncheck();
  await page.getByLabel(/Sequential download/).check();
  await page.getByLabel(/Prioritize first and last pieces/).check();
  await page.getByRole('button',{name:'Save options',exact:true}).click();
  await page.getByText('Options saved.',{exact:true}).waitFor();
  const opts=await waitFor(()=>status(['sequential_download','is_auto_managed','prioritize_first_last']),s=>s.sequential_download && !s.is_auto_managed && s.prioritize_first_last,'torrent option mapping');
  assert.equal(opts.sequential_download,true);assert.equal(opts.is_auto_managed,false);assert.equal(opts.prioritize_first_last,true);
  await page.getByRole('tab',{name:'files',exact:true}).click();
  await page.getByLabel('Priority for fixture.txt',{exact:true}).selectOption('1');
  await waitFor(()=>status(['file_priorities']),s=>s.file_priorities?.[0]===1,'file priority');
  await page.getByRole('button',{name:'Close details',exact:true}).click();
  await action('Resume');
  await waitFor(()=>status(['state']),s=>s.state!=='Paused','resume');
  await page.waitForTimeout(1700);
  await action('Pause');
  await waitFor(()=>status(['state']),s=>s.state==='Paused','pause');
  await action('Reannounce');
  await page.getByRole('checkbox',{name:'Select fixture.txt',exact:true}).check();
  await page.locator('.bulk-bar').getByRole('button',{name:'Recheck',exact:true}).click();
  await waitFor(()=>status(['progress']),s=>s.progress===100,'recheck of actual fixture data');
  await action('Move storage…');
  await page.getByLabel('Destination folder',{exact:true}).fill('/downloads/menu-check/moved');
  await page.getByRole('button',{name:'Move files',exact:true}).click();
  await waitFor(()=>status(['save_path']),s=>s.save_path==='/downloads/menu-check/moved','storage move');
  await action('Rename…');
  await page.getByPlaceholder('New name',{exact:true}).fill('renamed-fixture.txt');
  await page.getByRole('button',{name:'Rename',exact:true}).click();
  await waitFor(()=>status(['name']),s=>s.name==='renamed-fixture.txt','rename');
  await page.waitForTimeout(1700);
  await action('Remove…');
  await page.getByRole('button',{name:/Remove torrent and data/}).click();
  await waitFor(()=>rpc('web.update_ui',[['name'],{}]),s=>!s.torrents[hash],'remove');
  owned=[];
  assert.deepEqual(errors,[]);
  console.log(`Verified real Deluge ${hosted?'hosted':'companion'}: paths, network, proxy, cache, limits, file add, torrent options, resume, pause, reannounce, recheck, move, rename and removal.`);
} finally {
  if(owned.length)await rpc('core.remove_torrents',[owned,true]).catch(()=>{});
  if(original)await rpc('core.set_config',[Object.fromEntries(['download_location','move_completed_path','move_completed','listen_ports','random_port','proxy','cache_size','cache_expiry','max_download_speed','max_upload_speed','max_connections_global'].map(k=>[k,original[k]]))]).catch(()=>{});
  await browser.close();
}
