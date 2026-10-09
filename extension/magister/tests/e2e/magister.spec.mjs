import {test,expect,chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdtemp,readFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
const fixture={items:[{kolomId:42,waarde:'8,3',omschrijving:'Hoofdstuk 3',ingevoerdOp:'2026-10-06T10:00:00+02:00',vak:{code:'wi',omschrijving:'Wiskunde'},weegfactor:2}]};
const html=`<!doctype html><html lang="nl"><meta charset="utf-8"><style>body{margin:0;font:14px 'Segoe UI',sans-serif;background:#eef2f6}header{height:64px;background:#174f86;color:white;padding:20px;box-sizing:border-box}aside{position:absolute;top:64px;bottom:0;width:180px;background:#fff;padding:20px;box-sizing:border-box}.view{margin:24px 24px 24px 204px;background:white;min-height:400px}@media(max-width:520px){aside{display:none}.view{margin:16px}}</style><header>Magister · synthetic test fixture</header><aside>Cijfers</aside><div class="view ng-scope"><div id="cijfers-laatst-behaalde-resultaten-container"><button title="8,3">Native spoiler: 8,3</button></div></div><script>window.begin=()=>fetch('/api/personen/17/cijfers/laatste?top=25&skip=0',{headers:{Authorization:'synthetic-'+'test-token'}});setTimeout(window.begin,300);</script></html>`;
async function ax(cdp){return (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(node=>!node.ignored);}
async function click(cdp,name){const node=(await ax(cdp)).find(n=>n.role?.value==='button'&&n.name?.value===name);if(!node?.backendDOMNodeId)throw Error(`Missing button: ${name}`);const {object}=await cdp.send('DOM.resolveNode',{backendNodeId:node.backendDOMNodeId});await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){this.click()}',returnByValue:true});}
async function expandDebug(cdp){await cdp.send('Runtime.evaluate',{expression:"window['enable-magister-debug']()"});await expect.poll(async()=>JSON.stringify(await ax(cdp))).toContain('Debug logs (');const node=(await ax(cdp)).find(n=>n.name?.value?.startsWith('Debug logs (')&&n.backendDOMNodeId);if(!node)throw Error('Debug toggle missing');const {object}=await cdp.send('DOM.resolveNode',{backendNodeId:node.backendDOMNodeId});await cdp.send('Runtime.callFunctionOn',{objectId:object.objectId,functionDeclaration:'function(){this.click()}',returnByValue:true});}
test('Magister recent grades, concealment, opening, inventory and responsive placement',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'magister-extension-'));
 const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${resolve('dist')}`,`--load-extension=${resolve('dist')}`],viewport:{width:1280,height:850},reducedMotion:'reduce'});
 try{
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  // Replay synthetic API data in the worker; exercise actual capture, messaging,
  // packaged content script, storage worker and opening UI without a live login.
  await worker.evaluate(payload=>{globalThis.fetch=async()=>new Response(JSON.stringify(payload),{status:200,headers:{'content-type':'application/json'}});},fixture);
  await context.route('https://school.magister.net/**',route=>route.fulfill({status:200,contentType:route.request().url().includes('/api/')?'application/json':'text/html',body:route.request().url().includes('/api/')?JSON.stringify(fixture):html}));
  const page=await context.newPage();await page.goto('https://school.magister.net/#/cijfers');const cdp=await context.newCDPSession(page);
  await expect.poll(async()=>JSON.stringify(await ax(cdp)),{timeout:12000}).toContain('Open cijfer');
  await expect(page.locator('#po-magister-debug')).toHaveCount(0);const before=JSON.stringify(await ax(cdp));expect(before).not.toContain('8,3');expect(before).not.toContain('synthetic-test-token');
  expect(await page.locator('#cijfers-laatst-behaalde-resultaten-container').evaluate(node=>({display:getComputedStyle(node).display,inert:node.inert,aria:node.getAttribute('aria-hidden')}))).toEqual({display:'none',inert:true,aria:'true'});
  const bounds=await page.locator('#po-magister-panel').boundingBox();expect(bounds.x).toBe(204);expect(bounds.y).toBe(88);
  await mkdir('verification',{recursive:true});await page.screenshot({path:'verification/magister-desktop.png'});
  await page.setViewportSize({width:390,height:844});const mobile=await page.locator('#po-magister-panel').boundingBox();expect(mobile.x).toBe(16);expect(mobile.width).toBeLessThanOrEqual(358);await page.screenshot({path:'verification/magister-mobile.png'});
  await click(cdp,'Open cijfer');await expect.poll(async()=>JSON.stringify(await ax(cdp))).toContain('Cijfer openen');
  await page.keyboard.press('Enter');await expect.poll(async()=>JSON.stringify(await ax(cdp)),{timeout:12000}).toContain('8,3');
  await page.keyboard.press('Escape');await expect(page.locator('.po-experience-host')).toHaveCount(0);
  await click(cdp,'Inventory');await expect.poll(async()=>JSON.stringify(await ax(cdp))).toContain('8,3');
  const stored=await worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(stored.collection).toHaveLength(1);expect(JSON.stringify(stored)).not.toContain('synthetic-test-token');
  await expandDebug(cdp);await page.screenshot({path:'verification/magister-debug-mobile.png'});
  const downloadPromise=page.waitForEvent('download');await click(cdp,'Download logs (.txt)');const download=await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/CijferReveal-Magister-debug-.*\.txt$/);
  const exported=await readFile(await download.path(),'utf8');
  expect(exported).toContain('auth.session-captured');expect(exported).toContain('parser.completed');expect(exported).toContain('opening.phase');expect(exported).toContain('storage.command-completed');
  for(const secret of ['synthetic-test-token','8,3','Wiskunde','school.magister.net','Hoofdstuk 3'])expect(exported).not.toContain(secret);
  await page.reload();await expect.poll(async()=>JSON.stringify(await ax(cdp))).toContain('Opnieuw openen');await expandDebug(cdp);
  const secondPromise=page.waitForEvent('download');await click(cdp,'Download logs (.txt)');const second=await secondPromise;expect(await readFile(await second.path(),'utf8')).toContain('opening.phase');
  await page.evaluate(()=>{location.hash='#/vandaag';});await expect(page.locator('#po-magister-panel')).toHaveCount(0);
  expect(await page.locator('#cijfers-laatst-behaalde-resultaten-container').evaluate(node=>node.inert)).toBe(false);
  const source=await readFile('src/state/migrations.ts','utf8');expect(source).toContain('migrate');
 }finally{await context.close();}
});
test('debug export works when native containers are missing and the API fails',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'magister-debug-failure-'));
 const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${resolve('dist')}`,`--load-extension=${resolve('dist')}`],viewport:{width:1280,height:850}});
 try{
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');await worker.evaluate(()=>{globalThis.fetch=async()=>new Response('{}',{status:401});});
  const missing=html.replace('<div class="view ng-scope">','<div class="unknown-layout">').replace('id="cijfers-laatst-behaalde-resultaten-container"','id="unknown-grade-container"');
  await context.route('https://school.magister.net/**',route=>route.fulfill({status:200,contentType:'text/html',body:missing}));
  const page=await context.newPage();await page.goto('https://school.magister.net/#/cijfers');const cdp=await context.newCDPSession(page);
  await expect(page.locator('#po-magister-debug')).toHaveCount(0);await page.evaluate(()=>window['enable-magister-debug']());await expect(page.locator('#po-magister-debug')).toHaveCount(1);await expect(page.locator('#po-magister-panel')).toHaveCount(0);
  await expect.poll(async()=>await worker.evaluate(async()=>JSON.stringify((await chrome.storage.local.get('poMagisterDebugLog')).poMagisterDebugLog)),{timeout:10000}).toContain('dom.mount-check');
  await page.evaluate(()=>{const native=document.createElement('div');native.id='cijfers-container';document.querySelector('.unknown-layout').append(native);window.begin();});
  await expect.poll(async()=>await worker.evaluate(async()=>JSON.stringify((await chrome.storage.local.get('poMagisterDebugLog')).poMagisterDebugLog)),{timeout:10000}).toContain('api.recent-failed');
  await expandDebug(cdp);await page.screenshot({path:'verification/magister-debug-desktop.png'});
  const promise=page.waitForEvent('download');await click(cdp,'Download logs (.txt)');const exported=await readFile(await (await promise).path(),'utf8');
  expect(exported).toContain('api.recent-failed');expect(exported).toContain('"status":401');expect(exported).toContain('"parentFound":false');expect(exported).not.toContain('synthetic-test-token');
 }finally{await context.close();}
});
test('login with the extension active and a retained grade hash stays visible and transitions safely',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'magister-login-'));
 const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${resolve('dist')}`,`--load-extension=${resolve('dist')}`]});
 try{
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  await worker.evaluate(payload=>{globalThis.fixtureApiCalls=0;globalThis.fetch=async()=>{globalThis.fixtureApiCalls++;return new Response(JSON.stringify(payload),{status:200});};},fixture);
  const login=`<!doctype html><html lang="nl"><div class="view ng-scope"><div id="cijfers-container"><form id="login"><label>Gebruiker<input name="username"></label><label>Wachtwoord<input type="password"></label><button>Inloggen</button></form></div></div><script>document.querySelector('form').onsubmit=async event=>{event.preventDefault();await fetch('/api/personen/17/cijfers/laatste',{headers:{Authorization:'synthetic-'+'login'}});document.querySelector('#cijfers-container').innerHTML='<p>Native cijfer</p>';};</script></html>`;
  await context.route('https://school.magister.net/**',route=>route.fulfill({status:200,contentType:route.request().url().includes('/api/')?'application/json':'text/html',body:route.request().url().includes('/api/')?JSON.stringify(fixture):login}));
  const page=await context.newPage();await page.goto('https://school.magister.net/#/cijfers');const cdp=await context.newCDPSession(page);
  await expect(page.getByRole('button',{name:'Inloggen'})).toBeVisible();await expect(page.locator('#po-magister-panel')).toHaveCount(0);await expect(page.locator('#po-magister-debug')).toHaveCount(0);
  expect(await page.locator('#cijfers-container').evaluate(node=>({display:getComputedStyle(node).display,inert:node.inert,aria:node.getAttribute('aria-hidden')}))).toEqual({display:'block',inert:false,aria:null});
  expect(await worker.evaluate(()=>globalThis.fixtureApiCalls)).toBe(0);
  await page.getByRole('button',{name:'Inloggen'}).click();await expect.poll(async()=>JSON.stringify(await ax(cdp))).toContain('Open cijfer');
  expect(await worker.evaluate(()=>globalThis.fixtureApiCalls)).toBeGreaterThan(0);
  // Returning to a login form in the same SPA restores native visibility/inertness.
  await page.evaluate(()=>{document.querySelector('#cijfers-container').innerHTML='<form><label>Wachtwoord<input type="password"></label><button>Opnieuw inloggen</button></form>';});
  await expect(page.locator('#po-magister-panel')).toHaveCount(0);await expect(page.getByRole('button',{name:'Opnieuw inloggen'})).toBeVisible();
  expect(await page.locator('#cijfers-container').evaluate(node=>node.inert)).toBe(false);
 }finally{await context.close();}
});
test('shows the Magister update notice for a verified provider release',async()=>{
 const directory=await mkdtemp(resolve(tmpdir(),'magister-update-'));
 const context=await chromium.launchPersistentContext(directory,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${resolve('dist')}`,`--load-extension=${resolve('dist')}`]});
 try{
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  await worker.evaluate(payload=>{globalThis.fetch=async url=>new Response(JSON.stringify(String(url).startsWith('https://api.github.com/')?{tag_name:'v0.2.9',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.9',draft:false,prerelease:false,assets:[{name:'CijferReveal-Magister.zip',browser_download_url:'https://github.com/js664/CijferReveal/releases/download/v0.2.9/CijferReveal-Magister.zip'}]}:payload),{status:200});},fixture);
  await context.route('https://school.magister.net/**',route=>route.fulfill({status:200,contentType:route.request().url().includes('/api/')?'application/json':'text/html',body:route.request().url().includes('/api/')?JSON.stringify(fixture):html}));
  const page=await context.newPage();await page.goto('https://school.magister.net/#/cijfers');const cdp=await context.newCDPSession(page);
  await expect.poll(async()=>(await ax(cdp)).some(node=>node.role?.value==='link'&&node.name?.value==='Update bekijken')).toBe(true);

  const cache=await worker.evaluate(async()=> (await chrome.storage.local.get('poMagisterUpdateCache')).poMagisterUpdateCache);expect(cache.release.tag_name).toBe('v0.2.9');
 }finally{await context.close();}
});
