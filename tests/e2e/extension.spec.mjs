import {test,expect,chromium} from '@playwright/test';
import {resolve} from 'node:path';
import {mkdtemp,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
const hash=(...parts)=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
const clickAXButton=async(cdp,name)=>{const {nodes}=await cdp.send('Accessibility.getFullAXTree');const node=nodes.find(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value===name&&n.backendDOMNodeId);if(!node)throw new Error(`Accessible button not found: ${name}`);const resolved=await cdp.send('DOM.resolveNode',{backendNodeId:node.backendDOMNodeId});await cdp.send('Runtime.callFunctionOn',{objectId:resolved.object.objectId,functionDeclaration:'function(){this.click();}',returnByValue:true});};
// Measure the landing at the phase change, while the exiting reel still exists.
// Locator polling after the reveal can miss its short exit on slower CI hosts.
const captureLanding=async page=>page.evaluate(()=>{
 window.fixtureLandingOffset=null;const overlay=document.querySelector('.po-opening-overlay');
 const observer=new MutationObserver(()=>{if(!overlay.classList.contains('po-phase-result'))return;
  const marker=document.querySelector('.po-marker'),target=document.querySelector('[data-target-folio="true"]');
  if(marker&&target){const a=marker.getBoundingClientRect(),b=target.getBoundingClientRect();window.fixtureLandingOffset=Math.abs(a.left+a.width/2-b.left-b.width/2);}
  observer.disconnect();
 });observer.observe(overlay,{attributes:true,attributeFilter:['class']});
});
const inventoryShadow=async cdp=>{const {result}=await cdp.send('Runtime.evaluate',{expression:"document.querySelector('.po-inventory-host')",returnByValue:false});if(!result.objectId)throw new Error('Inventory host was not found');const {node}=await cdp.send('DOM.describeNode',{objectId:result.objectId,depth:-1,pierce:true});const shadow=node.shadowRoots?.[0];if(!shadow?.backendNodeId)throw new Error(`Inventory shadow root was not found on ${node.nodeName}`);return (await cdp.send('DOM.resolveNode',{backendNodeId:shadow.backendNodeId})).object.objectId;};
const inventoryEval=async(cdp,fn,arg)=>{const objectId=await inventoryShadow(cdp),result=await cdp.send('Runtime.callFunctionOn',{objectId,functionDeclaration:`function(arg){return (${fn.toString()})(this,arg)}`,arguments:arg===undefined?[]:[{value:arg}],returnByValue:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description??result.exceptionDetails.text??'Inventory evaluation failed');return result.result.value;};
const readInventory=cdp=>inventoryEval(cdp,function(root){const page=root.querySelector('.po-inventory-page');if(!page)return null;return{title:page.querySelector('h1')?.textContent?.trim(),heading:page.querySelector('h2')?.textContent?.trim(),values:[...page.querySelectorAll('.po-grade-card-value')].map(n=>n.textContent.trim()),cardCount:page.querySelectorAll('.po-inventory-card').length,text:page.innerText};});
const inventoryPoint=(cdp,selector)=>inventoryEval(cdp,function(root,selector){const element=root.querySelector(selector);if(!element)throw new Error(`Missing inventory control: ${selector}`);const r=element.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};},selector);
const clickInventory=async(page,cdp,selector)=>{const point=await inventoryPoint(cdp,selector);await page.mouse.click(point.x,point.y);};
const chooseInventory=async(page,cdp,selector,value)=>{const label=selector.match(/aria-label="([^"]+)"/)?.[1];if(!label)throw new Error(`Expected accessible inventory dropdown: ${selector}`);const point=await inventoryPoint(cdp,selector);await page.mouse.click(point.x,point.y);await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('[role="listbox"]')?.getAttribute('aria-label')??null)).toBe(label);const option=await inventoryPoint(cdp,`[role="option"][data-value="${value}"]`);await page.mouse.click(option.x,option.y);await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('[role="listbox"]')?.getAttribute('aria-label')??null)).toBeNull();};
const chooseInventoryKeyboard=async(page,cdp,selector,value)=>{const label=selector.match(/aria-label="([^"]+)"/)?.[1];if(!label)throw new Error(`Expected accessible inventory dropdown: ${selector}`);const point=await inventoryPoint(cdp,selector);await page.mouse.click(point.x,point.y);await page.keyboard.press('ArrowDown');await expect.poll(()=>inventoryEval(cdp,root=>root.activeElement?.getAttribute('role')??null)).toBe('option');const choice=await inventoryEval(cdp,function(root,value){const options=[...root.querySelectorAll('[role="option"]')];return{from:options.findIndex(option=>option.getAttribute('aria-selected')==='true'),to:options.findIndex(option=>option.getAttribute('data-value')===value)};},value);if(choice.from<0||choice.to<0)throw new Error(`Missing keyboard option ${value} in ${selector}`);for(let i=choice.from;i<choice.to;i++)await page.keyboard.press('ArrowDown');for(let i=choice.to;i<choice.from;i++)await page.keyboard.press('ArrowUp');await page.keyboard.press('Enter');await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('[role="listbox"]')?.getAttribute('aria-label')??null)).toBeNull();};
const salt='0'.repeat(64),scope=hash(salt,'account','fixture-student');
const raw={ $type:'resultaten.RGeldendVoortgangsdossierResultaat',links:[{rel:'self',id:'fixture-result-a',type:'resultaten.RGeldendVoortgangsdossierResultaat'}],formattedResultaat:'8,3',isCijfer:true,isLabel:false,additionalObjects:{vaknaam:'Wiskunde A',vakuuid:'fixture-subject',resultaatkolom:{type:'fixture-individual'}},omschrijving:'Hoofdstuk 3',datumInvoerEerstePoging:'2026-10-04T10:00:00+02:00',weging:2,periode:1,toetscode:'H3'};
const key=hash(salt,scope,'progression','fixture-result-a'),version=hash(salt,'version','8,3','2','Hoofdstuk 3',raw.datumInvoerEerstePoging,'1','H3','fixture-individual',raw.$type,'Wiskunde A','fixture-subject','true','false','false');
const display={key,version,subject:'Wiskunde A',description:'Hoofdstuk 3',date:raw.datumInvoerEerstePoging,weight:'2',value:'8,3',grade:8.3};
const observedRecord={id:'fixture-result-a',selfType:'resultaten.RGeldendVoortgangsdossierResultaat',family:'progression',value:'8,3',isCijfer:true,isLabel:false,aggregate:false,subject:'Wiskunde A',subjectId:'fixture-subject',description:'Hoofdstuk 3',date:'2026-10-04T10:00:00+02:00',weight:'2',period:'1',testCode:'H3',columnType:'fixture-individual'};
const opened=(id,value,grade,subject,description,openedAt)=>({key:id.repeat(64),version:id.toLowerCase().repeat(64),scope,subject,description,date:'2026-09-29T10:00:00+02:00',weight:grade===8.3?'2':'1',value,grade,openedAt});
const card=`<sl-laatste-resultaat-item role="button"><sl-resultaat-item><div class="root" role="text" aria-label="Wiskunde A cijfer 8,3"><div class="details"><div class="titel">Wiskunde A</div><div class="subtitel">4 okt · Hoofdstuk 3</div></div><div class="wegingcijfer"><span class="weging">2x</span><div class="cijfer"><span>8,3</span></div></div></div></sl-resultaat-item></sl-laatste-resultaat-item>`;
const html=`<!doctype html><html lang="nl"><meta charset="UTF-8"><style>body{margin:0;background:#f4f7fa;font:16px system-ui;color:#21314b}sl-tab-bar{display:flex;gap:24px;padding:0 24px;background:white}sl-tab{display:flex;align-items:center;min-height:56px;padding:0 12px;color:#435267;cursor:pointer}sl-tab[aria-selected="true"]{color:#1d2b3b;border-top:2px solid #3275c6;border-bottom:2px solid #3275c6}sl-cijfers{display:block;margin:40px auto;max-width:900px}sl-laatste-resultaat-item{display:block}.root{display:flex;align-items:center;justify-content:space-between;background:white;padding:24px;border-radius:12px}.po-safe-native{margin:16px 0}.titel{font-weight:600}.subtitel{color:#647188;margin-top:6px}</style><sl-tab-bar role="tablist"><sl-tab role="tab" data-path="/rooster">Rooster</sl-tab><sl-tab role="tab" data-path="/studiewijzer">Studiewijzer</sl-tab><sl-tab role="tab" data-path="/cijfers" aria-selected="true" tabindex="0">Cijfers</sl-tab><sl-tab role="tab" data-path="/berichten">Berichten</sl-tab></sl-tab-bar><sl-root></sl-root><script>window.fixtureCard=${JSON.stringify(card)};window.mount=async()=>{document.querySelector('sl-root').innerHTML='<sl-home><sl-cijfers><h1>Cijfers</h1><sl-laatsteresultaten></sl-laatsteresultaten></sl-cijfers></sl-home>';await fetch('/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student');document.querySelector('sl-laatsteresultaten').innerHTML=window.fixtureCard;window.initialVisibility=getComputedStyle(document.querySelector('sl-laatste-resultaat-item')).display;};document.querySelectorAll('sl-tab-bar sl-tab').forEach(tab=>tab.onclick=e=>{const path=tab.getAttribute('data-path');history.pushState({},'',path);document.querySelectorAll('sl-tab-bar sl-tab').forEach(item=>{item.setAttribute('aria-selected',String(item===tab));if(item!==tab)item.removeAttribute('tabindex');else item.tabIndex=0;});if(path==='/cijfers')window.mount();else document.querySelector('sl-root').innerHTML='<sl-home><p>Rooster</p></sl-home>';});window.addEventListener('popstate',()=>location.pathname==='/cijfers'?window.mount():document.querySelector('sl-root').replaceChildren());setTimeout(window.mount,180);</script></html>`;
const fixtureHtml=html.replace('</style>',`:root{--bg-base:#1b1f22;--bg-elevated-weak:#252b2f;--border-weak:#3b444b;--text-base:#e2e6e9;--text-muted:#aeb8c0;color-scheme:dark}body{background:var(--bg-base);color:var(--text-base);font-family:"Open Sans",sans-serif}.fixture-header{display:flex;align-items:center;height:64px;padding:0 24px;background:#20262a;font-size:20px;font-weight:600}sl-tab-bar{gap:12px;background:var(--bg-elevated-weak);overflow-x:auto}sl-tab{color:var(--text-muted);flex-shrink:0}sl-tab[aria-selected="true"]{color:var(--text-base);border-color:#80b5ed}sl-cijfers{max-width:1180px;margin:24px auto}.root{background:var(--bg-elevated-weak)}.subtitel{color:var(--text-muted)}@media(max-width:600px){sl-tab-bar{gap:0;padding:0 8px}sl-tab{padding:0 8px}} </style>`).replace('<sl-tab-bar role="tablist">','<header class="fixture-header">SOMtoday</header><sl-tab-bar role="tablist">');
async function launch(seed=false,build=process.env.PO_TEST_BUILD??'dist',stars=false,variant=null,updateRelease=null){
 const dir=await mkdtemp(resolve(tmpdir(),'po-extension-'));
 const context=await chromium.launchPersistentContext(dir,{channel:'chromium',headless:true,timezoneId:variant?.timezone,args:[`--disable-extensions-except=${resolve(build)}`,`--load-extension=${resolve(build)}`]});
 let worker=context.serviceWorkers()[0];if(!worker)worker=await context.waitForEvent('serviceworker');
 const id=worker.url().split('/')[2];
 if(seed)await worker.evaluate(async data=>{await chrome.storage.local.set({poState:data});},{schema:2,salt,records:{[key]:{key,scope,version,state:'pending',numeric:true,firstSeen:1,display}},coverage:{[scope]:{overview:true,subject:true,armed:true}},collection:[],settings:{sound:false,volume:.7,motion:'system'}});
 await context.route('https://leerling.somtoday.nl/**',route=>{const url=route.request().url();return route.fulfill({status:200,contentType:url.includes('/rest/')?'application/json':'text/html',body:url.includes('/rest/')?JSON.stringify({items:[raw]}):fixtureHtml});});
 if(updateRelease)await context.route('https://api.github.com/repos/js664/CijferReveal/releases/latest',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(updateRelease)}));
 if(stars){
 const starRaw={...raw,formattedResultaat:'*',links:[{rel:'self',id:1234567890123,type:raw.$type}]},second={...starRaw,links:[{rel:'self',id:1234567890124,type:raw.$type}],omschrijving:'Hoofdstuk 4'};
 const starCard=card.replaceAll('8,3','*'),starHtml=fixtureHtml.replace(JSON.stringify(card),JSON.stringify(starCard+starCard.replaceAll('Hoofdstuk 3','Hoofdstuk 4'))).replace("fetch('/rest/v1/","fetch('https://api.somtoday.nl/rest/v1/");
 await context.route('https://leerling.somtoday.nl/**',route=>route.fulfill({status:200,contentType:route.request().url().includes('/rest/')?'application/json':'text/html',body:route.request().url().includes('/rest/')?JSON.stringify({items:[starRaw,second]}):starHtml}));
 await context.route('https://api.somtoday.nl/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'https://leerling.somtoday.nl'},body:JSON.stringify({items:[starRaw,second]})}));
 if(seed){const starKey=hash(salt,scope,'progression','1234567890123');const starVersion=hash(salt,'version','*','2','Hoofdstuk 3',raw.datumInvoerEerstePoging,'1','H3','fixture-individual',raw.$type,'Wiskunde A','fixture-subject','true','false','false');await worker.evaluate(async data=>{await chrome.storage.local.set({poState:data});},{schema:2,salt,records:{[starKey]:{key:starKey,scope,version:starVersion,state:'observed-nonnumeric',numeric:false,firstSeen:1}},coverage:{},collection:[],settings:{sound:false,volume:.7,motion:'reduce'}});}
 }
 if(variant){
  let body=fixtureHtml.replace(JSON.stringify(card),JSON.stringify(variant.card)).replaceAll('fixture-student',variant.student);
  if(variant.subject)body=body.replaceAll('sl-laatsteresultaten','sl-vakresultaten');
  if(variant.endpoint)body=body.replace(`/rest/v1/geldendvoortgangsdossierresultaten/leerling/${variant.student}`,variant.endpoint);
  if(variant.exam)body=body.replaceAll('geldendvoortgangsdossierresultaten','geldendexamendossierresultaten');
  await context.route('https://leerling.somtoday.nl/**',route=>route.fulfill({status:200,contentType:route.request().url().includes('/rest/')?'application/json':'text/html',body:route.request().url().includes('/rest/')?JSON.stringify(variant.overview?{vakResultaten:[{perioden:[{resultaten:[variant.raw]}]}]}:{items:[variant.raw]}):body}));
 }
 const page=await context.newPage();await page.goto('https://leerling.somtoday.nl/cijfers');
 return {page,context,worker,id,dispose:async()=>{await context.close();await rm(dir,{recursive:true,force:true});}};
}
test('fresh install masks a numeric grade but offers its matching pack; SPA/remount/mobile/portals',async()=>{
 const f=await launch();try{await expect(f.page.locator('.po-safe-native')).toBeVisible();expect(await f.page.evaluate(()=>window.initialVisibility)).not.toBe('none');await expect(f.page.locator('sl-resultaat-item .root')).toBeVisible();await expect(f.page.locator('sl-resultaat-item .cijfer')).toHaveCSS('visibility','visible');await expect(f.page.locator('sl-resultaat-item .cijfer')).toHaveText('?');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
 await f.page.getByRole('tab',{name:'Rooster',exact:true}).click();await f.page.getByRole('tab',{name:'Cijfers',exact:true}).click();await expect(f.page.locator('sl-laatste-resultaat-item')).toBeVisible();await expect(f.page.locator('.po-safe-native')).toBeVisible();
 await f.page.goBack();await f.page.goForward();await expect(f.page.locator('.po-safe-native')).toBeVisible();
 await f.page.setViewportSize({width:390,height:844});await f.page.evaluate(()=>{const modal=document.createElement('sl-modal');modal.innerHTML='<div role="dialog"><button>Sluiten</button><sl-resultaat-item-detail class="in-modal"><span class="cijfer">8,3</span></sl-resultaat-item-detail></div>';document.body.append(modal);const tip=document.createElement('hmy-tooltip');tip.className='hmy-tooltip';tip.textContent='Toets 8,3';document.body.append(tip);document.querySelector('sl-cijfers').insertAdjacentHTML('beforeend','<sl-cijfer-overzicht><table><tr><td class="cijfer" aria-label="8,3">8,3</td></tr></table></sl-cijfer-overzicht><sl-vakresultaten><sl-vakresultaat-item aria-label="8,3"><sl-resultaat-item>8,3</sl-resultaat-item></sl-vakresultaat-item><div class="gemiddelde-wrapper" aria-label="Rapportcijfer 8,3">8,3</div></sl-vakresultaten><sl-vakgemiddelde-item-cijfer aria-label="8,3">8,3</sl-vakgemiddelde-item-cijfer>');});
 for(const selector of ['sl-resultaat-item-detail','hmy-tooltip','td.cijfer','sl-vakgemiddelde-item-cijfer','.gemiddelde-wrapper','sl-vakresultaat-item'])await expect(f.page.locator(selector)).toBeHidden();
 const cdp=await f.context.newCDPSession(f.page);const ax=await cdp.send('Accessibility.getFullAXTree');expect(ax.nodes.filter(n=>!n.ignored&&n.name?.value?.includes('8,3'))).toHaveLength(0);
 }finally{await f.dispose();}
});
test('latest stable GitHub API release shows a Dutch update notice with the API release link',async()=>{
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,null,{tag_name:'v0.2.6',html_url:'https://github.com/js664/CijferReveal/releases/tag/v0.2.6',draft:false,prerelease:false});
 try{await expect(f.page.getByRole('status',{name:'Extensie-update beschikbaar'})).toBeVisible({timeout:10000});await expect(f.page.getByText('Update beschikbaar')).toBeVisible();await expect(f.page.getByRole('link',{name:'Update bekijken'})).toHaveAttribute('href','https://github.com/js664/CijferReveal/releases/tag/v0.2.6');await f.page.getByRole('button',{name:'Melding sluiten'}).click();await expect(f.page.getByRole('status',{name:'Extensie-update beschikbaar'})).toHaveCount(0);}finally{await f.dispose();}
});
test('retry reloads SOMtoday so a transient grade-card mismatch can be observed again',async()=>{
 const f=await launch();try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await f.page.evaluate(()=>{document.querySelector('sl-laatste-resultaat-item .subtitel').textContent='4 okt · Nog niet geladen';});await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toBeVisible();const navigation=f.page.waitForNavigation();await f.page.getByRole('button',{name:'Pagina opnieuw laden'}).click();await navigation;await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();}finally{await f.dispose();}
});
test('Escape refunds an unfinished first opening and opened cards replay without duplicate inventory',async()=>{
 const f=await launch();try{
  await f.page.emulateMedia({reducedMotion:'reduce'});const cdp=await f.context.newCDPSession(f.page),readAX=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n'),readState=async()=>f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState),recordState=async()=>Object.values((await readState()).records).find(r=>r.display?.description==='Hoofdstuk 3')?.state;await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();await clickAXButton(cdp,'Open Cijfer');await expect.poll(async()=> await recordState()).toBe('opened');await f.page.waitForTimeout(120);await f.page.keyboard.press('Escape');await expect.poll(async()=> await recordState()).toBe('pending');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  let saved=await readState();expect(saved.collection).toHaveLength(0);
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX,{timeout:5000}).toContain('Cijfer 8,3');saved=await readState();expect(saved.collection).toHaveLength(1);await clickAXButton(cdp,'Terug naar SOMtoday');
  await f.page.locator('.po-safe-native').hover();const replay=f.page.getByRole('button',{name:'Cijfer opnieuw openen'});await expect(replay).toBeVisible();await replay.click();await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX,{timeout:5000}).toContain('Cijfer 8,3');saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(Object.values(saved.records).find(r=>r.display?.description==='Hoofdstuk 3')?.state).toBe('opened');expect(saved.collection).toHaveLength(1);
 }finally{await f.dispose();}
});
test('returning from vakgemiddelden keeps grade matches and subject pages free of repeated warnings',async()=>{
 const f=await launch();try{
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  const subjectCard=card.replace('sl-laatste-resultaat-item','sl-vakresultaat-item').replace('<div class="titel">Wiskunde A</div>','<div class="titel">Hoofdstuk 3</div>').replace('4 okt · Hoofdstuk 3','4 okt');
  await f.page.evaluate(()=>{history.pushState({},'','/cijfers/vakgemiddelden');document.querySelector('sl-root').innerHTML='<sl-home><sl-cijfers><h1>Vakgemiddelden</h1><sl-vakgemiddelde-item-cijfer><span>7,2</span></sl-vakgemiddelde-item-cijfer></sl-cijfers></sl-home>';});
  await expect(f.page.locator('html')).toHaveAttribute('data-po-route-excluded','true');await expect(f.page.locator('.po-safe-native,.po-inventory-tab')).toHaveCount(0);
  await f.page.evaluate(subjectCard=>{history.pushState({},'','/cijfers/vakresultaten?vak=2f4ccfd9-77c8-41a7-82a1-77609d665ceb&lichting=c5216b78-feed-47aa-82bb-244b45932f9c&plaatsing=68ab2cd8-470b-4df9-ac4e-2e05fed147a7&vaknaam=bedrijfseconomie');document.querySelector('sl-root').innerHTML=`<sl-home><sl-cijfers><sl-vakresultaten><div class="periodeheader"><div class="gemiddeldes-container"><div class="gemiddelde-wrapper"><div class="cijfer">*</div></div><div class="gemiddelde-wrapper"><div class="cijfer">*</div></div></div></div><sl-voortgangsresultaten>${subjectCard}</sl-voortgangsresultaten></sl-vakresultaten></sl-cijfers></sl-home>`;},subjectCard);
  await expect(f.page.locator('html')).not.toHaveAttribute('data-po-route-excluded');await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await expect(f.page.locator('sl-vakresultaten .po-derived-placeholder')).toHaveCount(0);await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toHaveCount(0);
  await f.page.evaluate(()=>{history.pushState({},'','/cijfers');document.querySelector('sl-root').innerHTML=`<sl-home><sl-cijfers><h1>Cijfers</h1><sl-laatsteresultaten>${window.fixtureCard}</sl-laatsteresultaten></sl-cijfers></sl-home>`;});
  await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toHaveCount(0);
 }finally{await f.dispose();}
});
test('seeded validated fixture opens only after stop, persists, and reloads without another pack',async()=>{
 const f=await launch(true);try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
 // Closed Shadow DOM inspected through the accessibility tree; no private extension APIs.
 const cdp=await f.context.newCDPSession(f.page);
 await clickAXButton(cdp,'Open Cijfer');
 const beamState=async()=>{const tree=await cdp.send('DOM.getDocument',{depth:-1,pierce:true});const find=node=>{const attrs=node.attributes??[];if(attrs.includes('po-mystery-beam')&&attrs.includes('data-active'))return node;for(const child of [...(node.children??[]),...(node.shadowRoots??[])]){const match=find(child);if(match)return match;}return null;};const node=find(tree.root);if(!node)return null;const resolved=await cdp.send('DOM.resolveNode',{backendNodeId:node.backendNodeId});const read=await cdp.send('Runtime.callFunctionOn',{objectId:resolved.object.objectId,functionDeclaration:'function(){const s=getComputedStyle(this);return {angle:s.getPropertyValue("--po-beam-angle"),opacity:Number(s.getPropertyValue("--po-beam-opacity"))};}',returnByValue:true});return read.result.value;};
 await expect.poll(async()=> (await beamState())?.opacity??0).toBeGreaterThan(.05);const before=await beamState();await expect.poll(async()=> (await beamState())?.angle,{timeout:5000}).not.toBe(before.angle);
 const readAX=async()=>{const r=await cdp.send('Accessibility.getFullAXTree');return r.nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');};expect(await readAX()).not.toContain('8,3');
 await expect.poll(async()=>{const s=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);return s.records[key]?.state;},{timeout:12000}).toBe('opened');
 await expect.poll(readAX,{timeout:12000}).toContain('Cijfer 8,3');const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(saved.collection).toHaveLength(1);await expect.poll(readAX).toContain('Terug naar SOMtoday');
 await clickAXButton(cdp,'Terug naar SOMtoday');await expect(f.page.locator('.po-opening-overlay')).toHaveCount(0);
 await f.page.reload();await expect(f.page.locator('.po-safe-native')).toContainText('8,3');await expect(f.page.locator('sl-resultaat-item .cijfer')).toHaveCSS('visibility','visible');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
 await f.page.getByRole('tab',{name:'Inventaris',exact:true}).click();expect(await readAX()).toContain('Hoofdstuk 3');
 }finally{await f.dispose();}
});

test('fresh install can open a uniquely matched numeric result and saves the real grade',async()=>{
 const f=await launch();try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();const cdp=await f.context.newCDPSession(f.page),readAX=async()=>{const tree=await cdp.send('Accessibility.getFullAXTree');return tree.nodes.filter(node=>!node.ignored).map(node=>node.name?.value??'').join('\n');};await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX,{timeout:12000}).toContain('Cijfer 8,3');await expect.poll(async()=> (await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).collection.length).toBe(1);const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(saved.collection[0]).toMatchObject({value:'8,3',grade:8.3});}finally{await f.dispose();}
});

test('fresh install can match and open a SOMtoday letter grade',async()=>{
 const student='letter-grade-student',letter={...raw,formattedResultaat:'O',isCijfer:false,isLabel:true};
 const letterCard=card.replaceAll('8,3','O');
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:letter,card:letterCard});
 try{
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
  const cdp=await f.context.newCDPSession(f.page),readAX=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(node=>!node.ignored).map(node=>node.name?.value??'').join('\n');
  await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX,{timeout:12000}).toContain('Cijfer O');
  const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(saved.collection).toHaveLength(1);expect(saved.collection[0]).toMatchObject({value:'O',grade:null,scope:hash(saved.salt,'account',student)});
  await clickAXButton(cdp,'Terug naar SOMtoday');await f.page.reload();
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
  await expect(f.page.locator('sl-resultaat-item .cijfer span')).toHaveText('O');
 }finally{await f.dispose();}
});
test('letter grades are matchable on subject pages reached from the grade averages view',async()=>{
 const student='subject-letter-student',letter={...raw,formattedResultaat:'V',isCijfer:false,isLabel:true};
 const subjectCard=card.replace('sl-laatste-resultaat-item','sl-vakresultaat-item').replace('<div class="titel">Wiskunde A</div>','<div class="titel">Hoofdstuk 3</div>').replace('4 okt · Hoofdstuk 3','4 okt').replaceAll('8,3','V');
 const endpoint=`/rest/v1/geldendvoortgangsdossierresultaten/vakresultaten/${student}/vak/fixture-subject/lichting/fixture-cohort`;
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:letter,card:subjectCard,subject:true,endpoint});try{
  await f.page.evaluate(()=>history.replaceState({},'','/cijfers/vakresultaten?vak=subject&lichting=cohort&plaatsing=placement&vaknaam=bedrijfseconomie'));
  await expect(f.page.locator('sl-vakresultaat-item')).toBeVisible();await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();const cdp=await f.context.newCDPSession(f.page);await clickAXButton(cdp,'Open Cijfer');await expect.poll(async()=> (await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).collection.length,{timeout:12000}).toBe(1);
  const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(state.collection[0]).toMatchObject({value:'V',grade:null,subject:'Wiskunde A'});
 }finally{await f.dispose();}
});

test('another learner on a fresh install can open a subject exam grade with different decimal and weight notation',async()=>{
 const type='resultaten.RGeldendExamendossierResultaat',student='another-fixture-student';
 const different={...raw,$type:type,links:[{rel:'self',id:9876543210123,type}],formattedResultaat:'6.75',omschrijving:'',weging:1,datumInvoerEerstePoging:'2026-09-29T10:00:00+02:00',additionalObjects:{vaknaam:'Engels',vakuuid:'other-fixture-subject',resultaatkolom:{type:'school-specific-column'}}};
 const otherCard=card.replaceAll('sl-laatste-resultaat-item','sl-vakresultaat-item').replaceAll('Wiskunde A','Engels').replaceAll('8,3','6,75').replaceAll('4 okt · Hoofdstuk 3','29 sep.').replaceAll('2x','1,0 ×');
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:different,card:otherCard,subject:true,exam:true});
 try{
  await expect(f.page.locator('sl-vakresultaat-item')).toBeVisible();await expect(f.page.locator('.cijfer')).toHaveText('?');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();const cdp=await f.context.newCDPSession(f.page);await clickAXButton(cdp,'Open Cijfer');
  await expect.poll(async()=> (await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).collection.length,{timeout:12000}).toBe(1);
  const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(saved.collection[0]).toMatchObject({value:'6.75',grade:6.75,subject:'Engels',scope:hash(saved.salt,'account',student)});
  expect(saved.collection[0].key).toBe(hash(saved.salt,hash(saved.salt,'account',student),'exam','9876543210123'));
 }finally{await f.dispose();}
});

test('a numeric grade arriving after installation receives its own open button and survives reload',async()=>{
 const f=await launch();try{
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);
  const published={...raw,links:[{rel:'self',id:'fixture-new-result',type:raw.$type}],formattedResultaat:'7,2',omschrijving:'Nieuwe toets'};
  const newCard=card.replaceAll('8,3','7,2').replaceAll('Hoofdstuk 3','Nieuwe toets');
  await f.context.route('**/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[raw,published]})}));
  await f.context.route('https://leerling.somtoday.nl/cijfers',route=>route.fulfill({status:200,contentType:'text/html',body:fixtureHtml.replace(JSON.stringify(card),JSON.stringify(card+newCard))}));
  await f.page.evaluate(async nextCard=>{window.fixtureCard+=nextCard;await window.mount();},newCard);
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);
  const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(Object.values(saved.records).find(r=>r.display?.description==='Nieuwe toets')).toMatchObject({state:'pending',display:{value:'7,2',grade:7.2}});
  await f.page.reload();await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);
 }finally{await f.dispose();}
});

test('an opened star becoming a numeric grade can be opened again without resetting local data',async()=>{
 const f=await launch(true,process.env.PO_TEST_BUILD??'dist',true);try{
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);await f.page.locator('.po-safe-native').first().hover();await f.page.getByRole('button',{name:'Open cijfer'}).first().click();
  const cdp=await f.context.newCDPSession(f.page),readAX=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');
  await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX).toContain('Cijfer *');await clickAXButton(cdp,'Terug naar SOMtoday');
  const first={...raw,formattedResultaat:'6,8',links:[{rel:'self',id:1234567890123,type:raw.$type}]},second={...first,formattedResultaat:'*',links:[{rel:'self',id:1234567890124,type:raw.$type}],omschrijving:'Hoofdstuk 4'};
  await f.context.route('https://api.somtoday.nl/**',route=>route.fulfill({status:200,contentType:'application/json',headers:{'access-control-allow-origin':'https://leerling.somtoday.nl'},body:JSON.stringify({items:[first,second]})}));
  await f.page.evaluate(async()=>{await fetch('https://api.somtoday.nl/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student');document.querySelector('sl-resultaat-item .cijfer span').textContent='6,8';});
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);await expect(f.page.locator('sl-resultaat-item .cijfer span').first()).toHaveText('?');
  await f.page.locator('.po-safe-native').first().hover();await f.page.getByRole('button',{name:'Open cijfer'}).first().click();await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX).toContain('Cijfer 6,8');
  const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(saved.collection.map(r=>r.value)).toEqual(['*','6,8']);
 }finally{await f.dispose();}
});
test('desktop and mobile fixture visuals, full reel and reduced motion',async({page})=>{
 await mkdir('.impeccable/review',{recursive:true});await page.goto('http://127.0.0.1:5174/tester.html');await page.getByRole('button',{name:'Test opening',exact:true}).click();await expect(page.locator('.po-preview')).toBeVisible();await expect(page.locator('.po-preview')).not.toContainText('8,9');await expect(page.locator('.po-opening-overlay')).toHaveCSS('opacity','1');await expect(page.locator('.po-preview')).toHaveCSS('opacity','1');const previewTilt=page.locator('.po-preview .po-tilt');const previewBox=await previewTilt.boundingBox();await page.mouse.move(previewBox.x+previewBox.width*.75,previewBox.y+previewBox.height*.25);await expect(previewTilt).toHaveClass(/po-is-hover/);await page.screenshot({path:'.impeccable/review/desktop-preview.png'});await page.keyboard.press('Enter');await expect(page.locator('.po-lane')).toBeVisible();await expect(page.locator('.po-track [data-beam]')).toHaveCount(44);await expect(page.locator('.po-mystery-grade').first()).toContainText(/\d/);await expect(page.locator('.po-opening-overlay')).toHaveCSS('opacity','1');await page.waitForTimeout(850);await expect.poll(()=>page.locator('[data-beam][data-active]').count()).toBeGreaterThan(0);const reelBox=await page.locator('.po-lane').boundingBox();expect(reelBox.height).toBeGreaterThan(330);const reelGrades=await page.locator('.po-mystery-grade').allTextContents();expect(reelGrades.some(grade=>grade.startsWith('2,'))).toBe(true);expect(reelGrades.some(grade=>grade.startsWith('9,'))).toBe(true);await expect(page.locator('[data-target-folio="true"] .po-mystery-grade')).toHaveText('8,9');await page.screenshot({path:'.impeccable/review/desktop-reel.png'});await expect(page.locator('.po-grade')).toHaveText('8,9',{timeout:10000});await expect(page.locator('.po-result')).toHaveCSS('opacity','1');const tilt=page.locator('.po-tilt');const box=await tilt.boundingBox();await page.mouse.move(box.x+box.width*.8,box.y+box.height*.2);await expect(tilt).toHaveClass(/po-is-hover/);await page.waitForTimeout(450);await page.screenshot({path:'.impeccable/review/desktop.png'});await page.getByRole('button',{name:'Terug naar SOMtoday'}).click();await page.setViewportSize({width:390,height:844});await page.getByLabel('Verminder beweging').check();await page.getByRole('button',{name:'Test opening',exact:true}).click();await expect(page.getByRole('button',{name:'Open Cijfer',exact:true})).toBeVisible();await expect(page.locator('.po-opening-overlay')).toHaveCSS('opacity','1');await expect(page.locator('.po-preview')).toHaveCSS('opacity','1');await page.screenshot({path:'.impeccable/review/mobile-preview.png'});await page.keyboard.press('Enter');await expect(page.locator('.po-grade')).toHaveText('8,9');await expect(page.locator('.po-result')).toHaveCSS('opacity','1');await page.screenshot({path:'.impeccable/review/mobile.png'});await expect(page.locator('.po-lane')).toHaveCount(0);
});

test('star is visible on its real reel card and lands at center without a second reveal',async({page})=>{
 await page.goto('http://127.0.0.1:5174/tester.html');await page.getByLabel('Cijfer').selectOption('*');await page.getByRole('button',{name:'Test opening',exact:true}).click();await page.getByRole('button',{name:'Open Cijfer',exact:true}).click();const lane=page.locator('.po-lane');await expect(lane).toBeVisible();await expect(page.locator('[data-target-folio="true"] .po-mystery-grade')).toHaveText('*');await expect(lane.locator('.po-mystery-grade').first()).toContainText(/\d/);await expect(page.locator('.po-grade')).toHaveCount(0);await captureLanding(page);await expect(page.locator('.po-grade')).toHaveText('*',{timeout:9000});const offset=await page.evaluate(()=>window.fixtureLandingOffset);expect(offset).toBeLessThan(1);await expect(page.locator('.po-grade')).toHaveText('*',{timeout:5000});await expect(page.locator('.po-grade')).toHaveAttribute('aria-label','Cijfer *');await expect(page.locator('.po-grade .po-digit-strip')).toHaveCount(0);
});

test('inventory is a native tab, protects only its route content, filters opened grades and survives browser history',async()=>{
 const f=await launch(true);try{
 const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState),entries=[opened('a','8,3',8.3,'Wiskunde A','Hoofdstuk 3',300),opened('b','5,8',5.8,'Engels','Essay',100),opened('c','*',null,'Bedrijfseconomie','Toets geldzaken',200)];
 const pendingKey='d'.repeat(64),pendingVersion='e'.repeat(64);state.records={[pendingKey]:{key:pendingKey,scope,version:pendingVersion,state:'pending',numeric:true,firstSeen:1,display:{...display,key:pendingKey,version:pendingVersion,value:'9,9',grade:9.9}}};state.collection=entries;await f.worker.evaluate(async s=>chrome.storage.local.set({poState:s}),state);
 await f.page.evaluate(({scope,record})=>window.postMessage({protocol:'po/1',surface:'recent',scope,records:[record],complete:false},location.origin),{scope,record:observedRecord});
 // Exercise a shell with the native header and tabs nested in the route,
 // which the former whole-route display:none strategy hid entirely.
 await expect(f.page.locator('sl-cijfers')).toBeVisible();
 await f.page.evaluate(()=>{const route=document.querySelector('sl-cijfers'),main=document.createElement('main');main.className='fixture-content';main.style.gridArea='content';main.style.maxWidth='720px';main.style.margin='0 auto';main.append(...route.children);route.append(main);route.style.display='grid';route.style.gridTemplateAreas='"header" "tabs" "content"';const bar=document.querySelector('sl-tab-bar'),header=document.querySelector('.fixture-header');bar.style.gridArea='tabs';header.style.gridArea='header';route.prepend(bar);route.prepend(header);});
 const button=f.page.getByRole('tab',{name:'Inventaris',exact:true});await expect(button).toBeVisible();expect(await f.page.getByRole('tab',{name:'Inventaris'}).count()).toBe(1);await button.click();
 const cdp=await f.context.newCDPSession(f.page),host=f.page.locator('.po-inventory-host');await expect(host).toBeVisible();await expect(button).toHaveAttribute('aria-selected','true');await expect(f.page.locator('sl-cijfers')).toBeVisible();await expect(f.page.locator('sl-laatsteresultaten')).toBeHidden();await expect(f.page.locator('.fixture-header')).toBeVisible();await expect(f.page.getByRole('tab',{name:'Rooster',exact:true})).toBeVisible();expect(await host.evaluate(n=>n.parentElement===document.body)).toBe(true);
 await expect.poll(()=>host.evaluate(n=>Math.abs(n.getBoundingClientRect().bottom-innerHeight))).toBeLessThan(2);await expect.poll(()=>host.evaluate(n=>Math.abs(n.getBoundingClientRect().top-document.querySelector('sl-tab-bar').getBoundingClientRect().bottom))).toBeLessThan(2);expect(await host.evaluate(n=>Math.abs(n.getBoundingClientRect().width-innerWidth))).toBeLessThan(1);
 const view=await readInventory(cdp);expect(view).toMatchObject({title:'Inventaris',values:['8,3','*','5,8'],cardCount:3});expect(view.text).toContain('3 geopend');expect(view.text).not.toContain('Gemiddelde');expect(view.text).not.toContain('Hoogste');expect(view.text).not.toContain('9,9');expect(view.text).not.toContain('veilig bewaard');expect(await f.page.locator('sl-cijfers').getAttribute('aria-hidden')).toBeNull();
 expect(await inventoryEval(cdp,function(root){const page=root.querySelector('.po-inventory-page'),style=getComputedStyle(page);return{scheme:style.colorScheme,background:style.backgroundColor,image:style.backgroundImage};})).toMatchObject({scheme:'dark',background:'rgba(0, 0, 0, 0)'});expect(await inventoryEval(cdp,function(root){return getComputedStyle(root.querySelector('.po-inventory-page')).backgroundImage;})).toContain('radial-gradient');
 expect(await inventoryEval(cdp,function(root){const seam=getComputedStyle(root.querySelector('.po-grade-card-shell'),'::before');return{content:seam.content,height:seam.height,opacity:seam.opacity};})).toMatchObject({content:'""',height:'1px',opacity:'0.45'});const card=await inventoryPoint(cdp,'.po-inventory-card');await f.page.mouse.move(card.x,card.y);await expect.poll(()=>inventoryEval(cdp,function(root){return getComputedStyle(root.querySelector('.po-grade-card-shell'),'::before').height;})).toBe('2px');await expect.poll(()=>inventoryEval(cdp,function(root){return getComputedStyle(root.querySelector('.po-grade-card-shell'),'::before').opacity;})).toBe('0.95');
 await clickInventory(f.page,cdp,'.po-inventory-filter-toggle');await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('.po-inventory-filter-toggle').getAttribute('aria-expanded'))).toBe('true');
 await clickInventory(f.page,cdp,'[aria-label="Vak"]');await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('[role="listbox"]')?.getAttribute('aria-label')??null)).toBe('Vak');
 await inventoryEval(cdp,function(root){root.querySelector('.po-inventory-select[aria-label="Vak"]').dispatchEvent(new FocusEvent('focusout',{bubbles:true,relatedTarget:null}));});
 await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('[role="listbox"]')?.getAttribute('aria-label')??null)).toBe('Vak');
 const engelsOption=await inventoryPoint(cdp,'[role="option"][data-value="Engels"]');await f.page.mouse.click(engelsOption.x,engelsOption.y);await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['5,8'],cardCount:1});await expect.poll(()=>inventoryEval(cdp,root=>root.querySelector('.po-inventory-select[aria-label="Vak"]').innerText)).toContain('Engels');
 await clickInventory(f.page,cdp,'[aria-label="Verwijder vakfilter Engels"]');await expect.poll(()=>readInventory(cdp)).toMatchObject({cardCount:3});
 await chooseInventoryKeyboard(f.page,cdp,'[aria-label="Cijfergroep"]','gold');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['8,3'],cardCount:1});
 await chooseInventory(f.page,cdp,'[aria-label="Cijfergroep"]','neutral');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['*'],cardCount:1});
 await clickInventory(f.page,cdp,'.po-inventory-clear');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['8,3','*','5,8'],cardCount:3});
 await chooseInventory(f.page,cdp,'[aria-label="Vak"]','Bedrijfseconomie');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['*'],cardCount:1});await clickInventory(f.page,cdp,'[aria-label="Verwijder vakfilter Bedrijfseconomie"]');
 const search=await inventoryPoint(cdp,'.po-inventory-search input');await f.page.mouse.click(search.x,search.y);await f.page.keyboard.type('Essay');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['5,8'],cardCount:1});await f.page.keyboard.press('Control+A');await f.page.keyboard.press('Backspace');await expect.poll(()=>readInventory(cdp)).toMatchObject({cardCount:3});
 await f.page.keyboard.type('*');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['*'],cardCount:1});await f.page.keyboard.press('Control+A');await f.page.keyboard.press('Backspace');await expect.poll(()=>readInventory(cdp)).toMatchObject({cardCount:3});
 await chooseInventory(f.page,cdp,'[aria-label="Sorteren"]','oldest');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['5,8','*','8,3'],cardCount:3});
 await chooseInventory(f.page,cdp,'[aria-label="Sorteren"]','highest');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['8,3','5,8','*'],cardCount:3});
 await clickInventory(f.page,cdp,'[aria-label="Sortering terugzetten op nieuwste eerst"]');await expect.poll(()=>readInventory(cdp)).toMatchObject({values:['8,3','*','5,8'],cardCount:3});
 await inventoryEval(cdp,function(root){root.querySelector('.po-inventory-card').click();});await expect.poll(()=>inventoryEval(cdp,function(root){const dialog=root.querySelector('.po-grade-detail');return{open:dialog.open,title:dialog.querySelector('h2')?.textContent?.trim(),details:dialog.innerText};})).toMatchObject({open:true,title:'8,3'});await expect.poll(()=>inventoryEval(cdp,function(root){return root.querySelector('.po-grade-detail').innerText;})).toContain('Geopend');await f.page.keyboard.press('Escape');await expect.poll(()=>inventoryEval(cdp,function(root){return root.querySelector('.po-grade-detail').open;})).toBe(false);
 await f.page.waitForTimeout(850);
 await f.page.screenshot({path:'.impeccable/review/inventory.png'});
 await f.page.setViewportSize({width:390,height:844});await expect(f.page.locator('.fixture-header')).toBeVisible();await expect(button).toBeVisible();expect(await f.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect.poll(()=>host.evaluate(n=>n.getBoundingClientRect().bottom-innerHeight)).toBeGreaterThanOrEqual(-2);await f.page.screenshot({path:'.impeccable/review/inventory-mobile.png'});await f.page.setViewportSize({width:1280,height:720});
 // Return the synthetic shell to its persistent fixture location before the
 // fixture replaces sl-root on history navigation (Angular keeps its real shell).
 await f.page.evaluate(()=>{document.body.prepend(document.querySelector('sl-tab-bar'));document.body.prepend(document.querySelector('.fixture-header'));});
 await f.page.goBack();await expect(host).toHaveCount(0);
 await button.focus();await f.page.keyboard.press('ArrowRight');await expect(f.page.getByRole('tab',{name:'Berichten',exact:true})).toHaveAttribute('aria-selected','true');await expect(host).toHaveCount(0);await expect(f.page.locator('sl-root')).toContainText('Rooster');
 }finally{await f.dispose();}
});

test('inventory empty state contains no sample grades and returns to Cijfers',async()=>{
 const f=await launch(true);try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();const tab=f.page.getByRole('tab',{name:'Inventaris',exact:true});await expect(tab).toBeVisible();await tab.click();await expect(tab).toHaveAttribute('aria-selected','true');const host=f.page.locator('.po-inventory-host'),cdp=await f.context.newCDPSession(f.page);await expect(host).toBeVisible();await expect.poll(()=>readInventory(cdp)).toMatchObject({heading:'Nog geen geopende cijfers',cardCount:0});await inventoryEval(cdp,function(root){root.querySelector('button').click();});await expect(host).toHaveCount(0);await expect(f.page.locator('sl-cijfers')).toBeVisible();}finally{await f.dispose();}
});

test('one click on Inventaris from another SOMtoday tab opens Cijfers and Inventory together',async()=>{
 const f=await launch(true);try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();await f.page.getByRole('tab',{name:'Rooster',exact:true}).click();await expect(f.page.locator('sl-cijfers')).toHaveCount(0);const tab=f.page.getByRole('tab',{name:'Inventaris',exact:true});await tab.click();await expect(f.page.locator('.po-inventory-host')).toBeVisible();await expect(tab).toHaveAttribute('aria-selected','true');await expect(f.page.locator('sl-cijfers')).toHaveCount(1);await expect(f.page.locator('sl-tab-bar')).toBeVisible();}finally{await f.dispose();}
});
test('development document-start diagnostic emits only stage/timing/component/visibility/route',async()=>{
 const f=await launch(false,'dist-dev');try{
 await expect(f.page.locator('.po-safe-native')).toBeVisible();
 const report=await f.worker.evaluate(async()=>{const tabs=await chrome.tabs.query({url:'https://leerling.somtoday.nl/*'});return chrome.tabs.sendMessage(tabs[0].id,{protocol:'po/diagnostics'});});
 expect(report.status,JSON.stringify(report)).toBe('success');expect(report.entries.some(e=>e.stage==='static-css')).toBe(true);expect(report.entries.some(e=>e.stage==='owner-mount')).toBe(true);expect(report.entries.some(e=>e.stage==='classification')).toBe(true);expect(report.entries.some(e=>e.stage==='safe-presentation')).toBe(true);
 expect(JSON.stringify(report)).not.toContain('8,3');expect(JSON.stringify(report)).not.toContain('fixture-result');expect(JSON.stringify(report)).not.toContain('Wiskunde');
 }finally{await f.dispose();}
});

test('two stars including a legacy observed record open, reveal stars and persist on reload',async()=>{
 const f=await launch(true,process.env.PO_TEST_BUILD??'dist',true);try{
 await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);
 await f.page.locator('.po-safe-native').first().hover();await f.page.getByRole('button',{name:'Open cijfer'}).first().click();
 const cdp=await f.context.newCDPSession(f.page);const readAX=async()=>{const r=await cdp.send('Accessibility.getFullAXTree');return r.nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');};
 await clickAXButton(cdp,'Open Cijfer');await expect.poll(readAX).toContain('Cijfer *');
 const ax=await cdp.send('Accessibility.getFullAXTree');const next=ax.nodes.find(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value==='Volgende openen');expect(next).toBeTruthy();const resolved=await cdp.send('DOM.resolveNode',{backendNodeId:next.backendDOMNodeId});await cdp.send('Runtime.callFunctionOn',{objectId:resolved.object.objectId,functionDeclaration:'function(){this.click();}'});
 await clickAXButton(cdp,'Open Cijfer');
 await expect.poll(async()=> (await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).collection.length).toBe(2);
 await expect.poll(readAX).toContain('Cijfer *');
 const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(saved.collection.map(r=>({value:r.value,grade:r.grade}))).toEqual([{value:'*',grade:null},{value:'*',grade:null}]);
 await f.page.reload();await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);await expect(f.page.locator('sl-resultaat-item .cijfer span')).toHaveText(['*','*']);
 await f.page.getByRole('tab',{name:'Inventaris',exact:true}).click();expect(await readAX()).toContain('*');
 }finally{await f.dispose();}
});

test('popup contains only version and reset, and reopens grades in an existing tab without reload',async()=>{
 const f=await launch(true);try{
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toBeVisible();
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
  const cdp=await f.context.newCDPSession(f.page);await clickAXButton(cdp,'Open Cijfer');
  await expect.poll(async()=> (await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).collection.length,{timeout:12000}).toBe(1);
  await expect.poll(async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.some(n=>!n.ignored&&n.role?.value==='button'&&n.name?.value==='Terug naar SOMtoday'),{timeout:12000}).toBe(true);
  await clickAXButton(cdp,'Terug naar SOMtoday');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
  const before=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  const popup=await f.context.newPage();await popup.goto(`chrome-extension://${f.id}/popup.html`);
  await expect(popup.locator('.po-popup-version')).toHaveText(`v${await f.worker.evaluate(()=>chrome.runtime.getManifest().version)}`);await expect(popup.getByRole('button')).toHaveCount(1);
  await expect(popup.getByRole('checkbox')).toHaveCount(0);await expect(popup.getByRole('heading')).toHaveCount(0);
  await popup.getByRole('button',{name:'Reset extensie'}).click();
  await expect(popup.getByRole('status')).toHaveText('Gereset. Je kunt alle cijfers opnieuw openen.');
  const after=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(after.collection).toEqual([]);expect(after.salt).toBe(before.salt);expect(after.resetGeneration).toBe(before.resetGeneration+1);
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);await expect(f.page.locator('.cijfer')).toHaveText('?');
  await popup.setViewportSize({width:240,height:116});await popup.screenshot({path:'.impeccable/review/popup.png'});
  await f.page.reload();await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);
 }finally{await f.dispose();}
});

test('reset closes an in-progress opening and a newly published grade still becomes available',async()=>{
 const f=await launch(true);try{
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
  const cdp=await f.context.newCDPSession(f.page);await clickAXButton(cdp,'Open Cijfer');
  const popup=await f.context.newPage();await popup.goto(`chrome-extension://${f.id}/popup.html`);await popup.getByRole('button',{name:'Reset extensie'}).click();
  await expect(f.page.locator('.po-experience-host')).toHaveCount(0);await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);
  const published={...raw,links:[{rel:'self',id:'new-after-reset',type:raw.$type}],formattedResultaat:'7,25',omschrijving:'Nieuwe toets'};
  await f.context.route('**/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[raw,published]})}));
  await f.page.evaluate(async next=>{await new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest();xhr.open('GET','/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student');xhr.responseType='json';xhr.onload=resolve;xhr.onerror=reject;xhr.send();});document.querySelector('sl-laatsteresultaten').insertAdjacentHTML('beforeend',next);},card.replaceAll('8,3','7,25').replaceAll('Hoofdstuk 3','Nieuwe toets'));
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);
  const saved=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
  expect(Object.values(saved.records).find(r=>r.display?.description==='Nieuwe toets')).toMatchObject({state:'pending',display:{value:'7,25',grade:7.25}});expect(saved.collection).toEqual([]);
 }finally{await f.dispose();}
});

test('mobile landing respects its CSS gap and Enter advances into the next subject preview',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:5174/tester.html');
 await page.getByLabel('Cijfer').selectOption('*');await page.getByLabel('Aantal').fill('2');
 await page.getByRole('button',{name:'Test opening',exact:true}).click();await expect(page.getByRole('button',{name:'Open Cijfer',exact:true})).toBeVisible();await page.keyboard.press('Enter');
 await expect(page.locator('.po-lane')).toBeVisible();await captureLanding(page);
 await expect(page.locator('.po-grade')).toHaveText('*',{timeout:9000});
 const offset=await page.evaluate(()=>window.fixtureLandingOffset);
 expect(offset).toBeLessThan(1);await expect(page.locator('.po-grade')).toHaveText('*');
 await page.keyboard.press('Enter');await expect(page.locator('.po-preview h2')).toHaveText('Nederlands');await expect(page.locator('.po-preview .po-grade')).toHaveCount(0);
 await page.keyboard.press('Escape');await expect(page.locator('.po-opening-overlay')).toHaveCount(0);
});

for(const [label,days,marker] of [['Vandaag',0],['Gisteren',1],['1 okt',null],['1 okt',null,true]]){
 test(`a fresh unrelated account with one ${label} grade${marker?' and a format marker':''} can open its real result`,async()=>{
  const date=days===null?new Date(2026,9,1,12):new Date();date.setHours(12,0,0,0);if(days!==null)date.setDate(date.getDate()-days);
  const student=`unrelated-${days}-student`,r={...raw,formattedResultaat:marker?'7,2 !':'7,2',formattedEerstePoging:marker?'7,2 !':'7,2',datumInvoerEerstePoging:date.toISOString(),weging:1,omschrijving:'Eerste toets',additionalObjects:{vaknaam:'Engels',vakuuid:'unrelated-subject',resultaatkolom:543210}};
  const c=card.replaceAll('Wiskunde A','Engels').replaceAll('8,3','7,2').replaceAll('4 okt · Hoofdstuk 3',`${label} • Eerste toets`).replaceAll('2x','1x');
  const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:r,card:c});try{
   await f.page.emulateMedia({reducedMotion:'reduce'});await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toHaveCount(0);
   await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
   const cdp=await f.context.newCDPSession(f.page);await clickAXButton(cdp,'Open Cijfer');
   await expect.poll(async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n')).toContain('Cijfer 7,2');
   const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
   expect(state.collection).toHaveLength(1);expect(state.collection[0]).toMatchObject({value:'7,2',grade:7.2,scope:hash(state.salt,'account',student)});
  }finally{await f.dispose();}
 });
}

test('real progression subject endpoint and test-title card work without a recent feed',async()=>{
 const student='subject-only-student',c=card.replaceAll('sl-laatste-resultaat-item','sl-vakresultaat-item').replaceAll('<div class="titel">Wiskunde A</div>','<div class="titel">Hoofdstuk 3</div>').replaceAll('4 okt · Hoofdstuk 3','4 okt');
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw,card:c,subject:true,endpoint:`/rest/v1/geldendvoortgangsdossierresultaten/vakresultaten/${student}/vak/fixture-subject/lichting/fixture-cohort`});
 try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);await expect(f.page.locator('sl-vakresultaat-item .cijfer')).toHaveText('?');}finally{await f.dispose();}
});

test('a scoped overview can supply a fresh account when the recent result feed is missing',async()=>{
 const student='overview-only-student',f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw,card,overview:true,endpoint:`/rest/v1/geldendvoortgangsdossierresultaten/leerling/cijferoverzicht/${student}`});
 try{await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(Object.values(state.records)[0].scope).toBe(hash(state.salt,'account',student));}finally{await f.dispose();}
});

test('first attempt and retake reveal their own values and never queue an invisible overall grade',async()=>{
 const student='retake-student',r={...raw,formattedResultaat:'6,0',formattedEerstePoging:'4,0',formattedHerkansing1:'8,0',datumInvoerEerstePoging:'2026-09-29T10:00:00+02:00',datumInvoerHerkansing1:raw.datumInvoerEerstePoging};
 const first=card.replaceAll('8,3','4,0').replaceAll('4 okt','29 sep'),second=card.replaceAll('8,3','8,0');
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:r,card:first+second});try{
  await f.page.emulateMedia({reducedMotion:'reduce'});await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(2);
  await f.page.locator('.po-safe-native').first().hover();await f.page.getByRole('button',{name:'Open cijfer'}).first().click();
  const cdp=await f.context.newCDPSession(f.page),ax=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');
  await clickAXButton(cdp,'Open Cijfer');await expect.poll(ax).toContain('Cijfer 4,0');await clickAXButton(cdp,'Volgende openen');await clickAXButton(cdp,'Open Cijfer');await expect.poll(ax).toContain('Cijfer 8,0');
  expect(await ax()).not.toContain('Volgende openen');const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(state.collection.map(c=>c.value)).toEqual(['4,0','8,0']);
 }finally{await f.dispose();}
});

test('SOMtoday merged progression and exam records keep one real open button',async()=>{
 const student='merged-dossier-student',r={...raw,additionalObjects:{...raw.additionalObjects,resultaatkolom:543210}},f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:r,card});
 try{
  const type='resultaten.RGeldendExamendossierResultaat',exam={...r,$type:type,links:[{rel:'self',id:'separate-exam-record',type}]};
  await f.context.route('**/rest/v1/geldendexamendossierresultaten/leerling/merged-dossier-student',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({items:[exam]})}));
  await f.page.evaluate(async()=>{await fetch('/rest/v1/geldendexamendossierresultaten/leerling/merged-dossier-student');});
  await expect.poll(async()=> Object.keys((await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).records).length).toBe(1);
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toHaveCount(0);
 }finally{await f.dispose();}
});

for(const timezone of ['UTC','Europe/Amsterdam','America/Los_Angeles']){
 test(`synthetic midnight-offset October 1 grade matches SOMtoday parsing in ${timezone}`,async()=>{
  // Synthetic API timestamp; the affected user's raw response has not been provided.
  const student='different-october-student',r={...raw,formattedResultaat:'6,3',formattedEerstePoging:'6,3',datumInvoerEerstePoging:'2026-10-01T00:15:00+02:00',weging:4,omschrijving:'Leesstrategieën',additionalObjects:{vaknaam:'Nederlands',vakuuid:'dutch-subject',resultaatkolom:543210}};
  const c=card.replaceAll('Wiskunde A','Nederlands').replaceAll('8,3','6,3').replaceAll('4 okt · Hoofdstuk 3','1 okt - Leesstrategieën').replaceAll('2x','4x');
  const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student,raw:r,card:c,timezone});try{
   await f.page.emulateMedia({reducedMotion:'reduce'});await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');
   await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();
   const cdp=await f.context.newCDPSession(f.page),ax=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');
   await expect.poll(ax).toContain('1 oktober');await clickAXButton(cdp,'Open Cijfer');await expect.poll(ax).toContain('Cijfer 6,3');
   const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(state.collection).toHaveLength(1);expect(state.collection[0]).toMatchObject({value:'6,3',grade:6.3,weight:'4'});
  }finally{await f.dispose();}
 });
}

const exactDebugRecord={id:'po-debug-progression',selfType:'resultaten.DebugResultaat',type:'resultaten.DebugResultaat',family:'progression',value:'6,3',isCijfer:true,isLabel:false,subject:'Nederlands',subjectId:'po-debug-subject',description:'Debugtoets',date:'2026-10-01T00:00:00',weight:'4x',period:'DEBUG',testCode:'PO-DEBUG',columnType:'Toetskolom',aggregate:false};
const exactDebugExam={...exactDebugRecord,id:'po-debug-exam',family:'exam'};
const exactDebugCard=card.replaceAll('Wiskunde A','Nederlands').replaceAll('8,3','6,3').replaceAll('4 okt · Hoofdstuk 3','1 okt • Debugtoets').replaceAll('2x','4x');
async function injectDebug(f,records){
 const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);
 const debugScope=hash(state.salt,'account','debug-learner');
 await f.page.evaluate(({records,scope})=>window.postMessage({protocol:'po/1',surface:'recent',scope,complete:false,records},location.origin),{records,scope:debugScope});return debugScope;
}
test('UNCHANGED debug userscript pair remains fail-closed without an explicit shared column identity',async()=>{
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student:'debug-learner',raw:{},card:exactDebugCard});try{
  await expect(f.page.locator('.po-safe-native')).toBeVisible();await injectDebug(f,[exactDebugRecord,exactDebugExam]);
  await expect.poll(async()=>Object.keys((await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).records).length).toBe(2);
  await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toBeVisible();await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
 }finally{await f.dispose();}
});
test('PROVEN po/1 aliases share one pack, opened state, inventory entry and durable identity after reload',async()=>{
 const records=[{...exactDebugRecord,columnId:'explicit-shared-column'},{...exactDebugExam,columnId:'explicit-shared-column'}];
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student:'debug-learner',raw:{},card:exactDebugCard});try{
  await f.page.emulateMedia({reducedMotion:'reduce'});await expect(f.page.locator('.po-safe-native')).toBeVisible();const debugScope=await injectDebug(f,records);
  await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(1);
  const pending=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(Object.values(pending.records).filter(r=>r.scope===debugScope&&r.state==='pending')).toHaveLength(1);expect(Object.keys(pending.aliases)).toHaveLength(2);
  await f.page.locator('.po-safe-native').hover();await f.page.getByRole('button',{name:'Open cijfer'}).click();const cdp=await f.context.newCDPSession(f.page),ax=async()=> (await cdp.send('Accessibility.getFullAXTree')).nodes.filter(n=>!n.ignored).map(n=>n.name?.value??'').join('\n');
  await clickAXButton(cdp,'Open Cijfer');await expect.poll(ax).toContain('Cijfer 6,3');expect(await ax()).not.toContain('Volgende openen');
  const openedState=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(openedState.collection).toHaveLength(1);expect(Object.values(openedState.records).filter(r=>r.state==='pending')).toHaveLength(0);expect(Object.values(openedState.aliases).every(a=>a.openedSignature===a.signature)).toBe(true);
  await f.page.keyboard.press('Escape');await f.page.reload();await expect(f.page.locator('.po-safe-native')).toBeVisible();await injectDebug(f,[...records].reverse());
  await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);await expect(f.page.locator('.cijfer')).toHaveText('6,3');
  const reloaded=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(reloaded.collection).toHaveLength(1);expect(Object.keys(reloaded.records)).toHaveLength(1);
  await f.page.getByRole('tab',{name:'Inventaris',exact:true}).click();await expect(f.page.locator('.po-inventory-host')).toBeVisible();await expect.poll(()=>readInventory(cdp)).toMatchObject({cardCount:1,values:['6,3']});
 }finally{await f.dispose();}
});
test('distinct result columns and conflicting test codes cannot be merged by identical visible metadata',async()=>{
 for(const patch of [{columnId:'other-column'},{testCode:'OTHER-TEST'}]){
  const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student:'debug-learner',raw:{},card:exactDebugCard});try{
   await expect(f.page.locator('.po-safe-native')).toBeVisible();await injectDebug(f,[{...exactDebugRecord,columnId:'first-column'},{...exactDebugExam,columnId:'first-column',...patch}]);
   await expect.poll(async()=>Object.keys((await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState)).records).length).toBe(2);
   await expect(f.page.getByText('Cijfer nog niet gekoppeld')).toBeVisible();await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
  }finally{await f.dispose();}
 }
});

test('legacy opened raw dossier entries migrate through the real bridge without duplicate inventory or replay',async()=>{
 const f=await launch(false,process.env.PO_TEST_BUILD??'dist',false,{student:'debug-learner',raw:{},card:exactDebugCard});try{
  await expect(f.page.locator('.po-safe-native')).toBeVisible();
  const state=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState),account=hash(state.salt,'account','debug-learner');
  const rawVersion=hash(state.salt,'version','6,3','4x','Debugtoets','2026-10-01T00:00:00','DEBUG','PO-DEBUG','Toetskolom','resultaten.DebugResultaat','Nederlands','po-debug-subject','true','false','false');
  state.records={};state.collection=[];delete state.aliases;
  for(const [index,r] of [exactDebugRecord,exactDebugExam].entries()){
   const rawKey=hash(state.salt,account,r.family,r.id),display={key:rawKey,version:rawVersion,subject:r.subject,description:r.description,date:r.date,weight:r.weight,value:r.value,grade:6.3};
   state.records[rawKey]={key:rawKey,scope:account,version:rawVersion,state:'opened',numeric:true,firstSeen:index+1,display};state.collection.push({...display,scope:account,openedAt:index+10});
  }
  await f.worker.evaluate(async state=>chrome.storage.local.set({poState:state}),state);
  await injectDebug(f,[{...exactDebugRecord,columnId:'explicit-shared-column'},{...exactDebugExam,columnId:'explicit-shared-column'}]);
  await expect(f.page.locator('.po-safe-native')).toHaveAttribute('data-po-link-problem','matched');await expect(f.page.getByRole('button',{name:'Open cijfer'})).toHaveCount(0);
  const migrated=await f.worker.evaluate(async()=> (await chrome.storage.local.get('poState')).poState);expect(Object.keys(migrated.records)).toHaveLength(1);expect(migrated.collection).toHaveLength(1);expect(Object.values(migrated.aliases).every(a=>a.openedSignature===a.signature)).toBe(true);
 }finally{await f.dispose();}
});

test('the vakgemiddelden URL has no injected extension UI or hidden grade styles',async()=>{
 const f=await launch();try{
  await f.page.goto('https://leerling.somtoday.nl/cijfers/vakgemiddelden');
  await expect(f.page.locator('sl-cijfers')).toBeVisible();
  await f.page.evaluate(()=>{document.querySelector('sl-cijfers').innerHTML='<h1>Vakgemiddelden</h1><sl-vakgemiddelde-item-cijfer><span>7,2</span></sl-vakgemiddelde-item-cijfer><sl-laatste-resultaat-item><sl-resultaat-item><div class="root"><div class="cijfer"><span>7,2</span></div></div></sl-resultaat-item></sl-laatste-resultaat-item>';});
  await expect(f.page.locator('sl-vakgemiddelde-item-cijfer')).toBeVisible();
  await expect(f.page.locator('.po-safe-native,.po-experience-host,.po-inventory-tab,.po-derived-placeholder,.po-overview-status')).toHaveCount(0);
  await expect(f.page.locator('sl-laatste-resultaat-item .cijfer span')).toHaveText('7,2');
  expect(await f.page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--po-shield-installed').trim())).toBe('');
 }finally{await f.dispose();}
});

test('SPA navigation into vakgemiddelden removes mounted effects and resumes on a normal cijfers route',async()=>{
 const f=await launch();try{
  await expect(f.page.locator('.po-safe-native')).toBeVisible();
  await f.page.evaluate(()=>{history.pushState({},'', '/cijfers/vakgemiddelden');document.querySelector('sl-root').innerHTML='<sl-home><sl-cijfers><h1>Vakgemiddelden</h1><sl-vakgemiddelde-item-cijfer><span>7,2</span></sl-vakgemiddelde-item-cijfer></sl-cijfers></sl-home>';});
  await expect(f.page.locator('sl-vakgemiddelde-item-cijfer')).toBeVisible();
  await expect(f.page.locator('.po-safe-native,.po-experience-host,.po-inventory-tab,.po-derived-placeholder,.po-overview-status')).toHaveCount(0);
  await expect(f.page.locator('html')).toHaveAttribute('data-po-route-excluded','true');
  const observations=await f.page.evaluate(async()=>{let count=0;const listener=(event)=>{if(event.source===window&&event.data?.protocol==='po/1')count++;};window.addEventListener('message',listener);await fetch('/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture-student');await new Promise(resolve=>setTimeout(resolve,30));window.removeEventListener('message',listener);return count;});expect(observations).toBe(0);
  await f.page.evaluate(()=>{history.pushState({},'', '/cijfers');window.mount();});
  await expect(f.page.locator('.po-safe-native')).toBeVisible();await expect(f.page.locator('html')).not.toHaveAttribute('data-po-route-excluded');
 }finally{await f.dispose();}
});
