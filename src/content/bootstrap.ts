import {Bridge} from './bridge';
import {Experience} from './mount';
import {joinCard,explainCard} from '../somtoday/dom-join';
import {readCardTuple} from '../somtoday/dom-card';
import {nativeCardValues,presentCard,type Presentation} from '../spoiler/recent-card';
import {presentDerived,presentOverview} from '../spoiler/derived';
import {injectInventoryTab,type InventoryTabController} from '../collection/CollectionTab';
import {listenRoutes} from './route-controller';
import {syncUpdateNotice,disposeUpdateNotice} from './update-notice';
import type {State} from '../state/schema';
import {diagnose,diagnosticReport,diagnosticStage,isConcealed,updateCardDiagnostic} from '../dev/diagnostics';
// Start the version lookup on the SOMtoday landing page, before the user opens Cijfers.
syncUpdateNotice();
if(import.meta.env.DEV)diagnosticStage('document-start','document',!document.querySelector('sl-laatste-resultaat-item,sl-vakresultaat-item'));
let cssMeasured=false;
const OWNER='sl-laatste-resultaat-item,sl-vakresultaat-item';
// Subject details are opened from Vakgemiddelden. Keep both screens entirely
// native so a grade on a subject result card cannot start or replay a pack.
const isExcludedRoute=()=>/^\/cijfers\/(?:vakgemiddelden|vakresultaten)(?:\/|$)/i.test(location.pathname);
const unsupportedOwners=new WeakMap<HTMLElement,string|null>();
const presentations=new Map<HTMLElement,Presentation>();let gradeRoot:HTMLElement|null=null,gradeObserver:MutationObserver|null=null,scheduled=false,failed=false;
let excludedRoute=false;
let lastScope:string|null=null;
const bridge=new Bridge(()=>{if(lastScope&&lastScope!==bridge.activeScope)experience.close();lastScope=bridge.activeScope;failed=false;schedule();},()=>{failed=true;schedule();});
const experience=new Experience(()=>bridge.state,()=>bridge.refresh());
const retryGradeDetection=()=>window.location.reload();
const INVENTORY_HISTORY='__poInventory';let inventoryTab:InventoryTabController|null=null,pendingInventory=false,pendingCijfersHop=false,inventoryURL='';
function isCijfersTab(tab:HTMLElement){return /^cijfers\b/i.test((tab.getAttribute('aria-label')??tab.textContent??'').replace(/\s+/g,' ').trim());}
function getCijfersTab(){return [...document.querySelectorAll<HTMLElement>('sl-tab-bar sl-tab,sl-tab-bar [role="tab"]')].find(isCijfersTab)??null;}
function clearInventoryHistory(){const current=history.state;if(!current||typeof current!=='object'||!(INVENTORY_HISTORY in current))return;const next={...current};delete next[INVENTORY_HISTORY];history.replaceState(next,'',location.href);}
function closeInventory(clearHistory=true){pendingInventory=false;pendingCijfersHop=false;inventoryTab?.setActive(false);if(experience.inventoryActive)experience.close();if(clearHistory)clearInventoryHistory();}
function goToCijfers(){const tab=getCijfersTab();if(tab)tab.click();else closeInventory();}
function markInventoryHistory(push:boolean){inventoryURL=location.href;const state=history.state&&typeof history.state==='object'?history.state:{};if(!(INVENTORY_HISTORY in state))history[push?'pushState':'replaceState']({...state,[INVENTORY_HISTORY]:true},'',location.href);}
function completeCijfersHop(){if(!pendingInventory||!pendingCijfersHop||!document.querySelector('sl-cijfers'))return false;pendingCijfersHop=false;markInventoryHistory(false);inventoryTab?.setActive(true);tryStartInventory();return true;}
function startInventory(){if(experience.active||pendingInventory)return;pendingInventory=true;inventoryTab?.setActive(true);if(document.querySelector('sl-cijfers'))markInventoryHistory(true);else{pendingCijfersHop=true;getCijfersTab()?.click();completeCijfersHop();window.setTimeout(()=>{completeCijfersHop();tryStartInventory();},80);window.setTimeout(()=>{completeCijfersHop();tryStartInventory();},240);}tryStartInventory();}
function tryStartInventory(){if(!pendingInventory||experience.active)return;const route=document.querySelector<HTMLElement>('sl-cijfers');if(!route)return;const button=inventoryTab?.button;if(!button)return;if(experience.showInventory(bridge.activeScope,button,route,!!bridge.activeScope,goToCijfers))pendingInventory=false;}
function syncInventory(){
 inventoryTab=injectInventoryTab(startInventory,tab=>{if(pendingInventory&&isCijfersTab(tab))return;if(pendingInventory||experience.inventoryActive)closeInventory(true);});
 completeCijfersHop();
 if(history.state?.[INVENTORY_HISTORY]&&location.href===inventoryURL&&!pendingInventory&&!experience.inventoryActive)pendingInventory=true;
 inventoryTab?.setActive(pendingInventory||experience.inventoryActive);
 tryStartInventory();
 if(experience.inventoryActive)experience.updateInventory(bridge.activeScope,!!bridge.activeScope,goToCijfers);
}
function clear(){for(const p of presentations.values())p.dispose();presentations.clear();}
function syncExcludedRoute(){
 const excluded=isExcludedRoute();if(excluded)document.documentElement.setAttribute('data-po-route-excluded','true');else document.documentElement.removeAttribute('data-po-route-excluded');
 if(excluded&&!excludedRoute){excludedRoute=true;bridge.pause();gradeObserver?.disconnect();gradeObserver=null;gradeRoot=null;clear();
  const root=document.querySelector<HTMLElement>('sl-cijfers');if(root){for(const owner of root.querySelectorAll<HTMLElement>('.po-unsupported-owner')){const original=unsupportedOwners.get(owner);if(original===null)owner.removeAttribute('aria-hidden');else if(original!==undefined)owner.setAttribute('aria-hidden',original);unsupportedOwners.delete(owner);owner.classList.remove('po-unsupported-owner');}root.querySelectorAll('.po-derived-placeholder,.po-overview-status').forEach(node=>node.remove());}
  closeInventory(true);inventoryTab?.remove();inventoryTab=null;experience.close();
 }else if(!excluded&&excludedRoute){excludedRoute=false;bridge.resume();}
 return excluded;
}
function reconcileOwner(owner:HTMLElement){
 const old=presentations.get(owner);
 // Unknown/transient templates must stay shielded, including text outside
 // the normal .cijfer node. Revisit them when Angular finishes rendering.
 if(!owner.querySelector('sl-resultaat-item .root')||!owner.querySelector('sl-resultaat-item .cijfer')){
  if(!unsupportedOwners.has(owner))unsupportedOwners.set(owner,owner.getAttribute('aria-hidden'));
  owner.classList.add('po-unsupported-owner');owner.setAttribute('aria-hidden','true');old?.update(null,undefined,undefined,()=>{},retryGradeDetection);return;
 }
 if(unsupportedOwners.has(owner)){const original=unsupportedOwners.get(owner);if(original===null)owner.removeAttribute('aria-hidden');else if(original!==undefined)owner.setAttribute('aria-hidden',original);unsupportedOwners.delete(owner);owner.classList.remove('po-unsupported-owner');}
 diagnose(owner);
 const tuple=readCardTuple(owner,nativeCardValues(owner));
 const live=[...bridge.records.values()].filter(r=>r.scope===bridge.activeScope);
 const explanation=explainCard(tuple,live.map(x=>x.record),record=>live.find(x=>x.record===record)!.key);
 const result=failed?null:joinCard(tuple,live.map(x=>x.record),record=>live.find(x=>x.record===record)!.key);
 if(import.meta.env.DEV){if(failed)explanation.reason='Lokale opslag is niet beschikbaar';else if(result){const selectedLive=live.find(x=>x.record===result),stored=selectedLive?bridge.state?.records[selectedLive.key]:undefined;if(!stored||stored.version!==selectedLive?.version)explanation.reason='Metadata matcht, maar er is geen actuele veilige presentatie in lokale opslag';}updateCardDiagnostic(owner,explanation);}
 diagnosticStage('classification',owner.tagName.toLowerCase(),isConcealed(owner));
 const selected=result?live.find(x=>x.record===result):null;const candidate=selected?bridge.state?.records[selected.key]:null;const stored=candidate?.version===selected?.version?candidate:undefined;
 const linkProblem=result?'matched':failed?'storage':live.length?'metadata':'no-api';
 if(old){old.update(result,stored?.state,stored?.display,(display,origin)=>{if(bridge.activeScope)experience.open(display,origin,bridge.activeScope);},retryGradeDetection);old.host.dataset.poLinkProblem=linkProblem;diagnosticStage('safe-presentation',owner.tagName.toLowerCase(),isConcealed(owner));return;}
 const presentation=presentCard(owner,result,stored?.state,stored?.display,(display,origin)=>{if(bridge.activeScope)experience.open(display,origin,bridge.activeScope);},retryGradeDetection);presentation.host.dataset.poLinkProblem=linkProblem;presentations.set(owner,presentation);diagnosticStage('safe-presentation',owner.tagName.toLowerCase(),isConcealed(owner));
}
function schedule(){syncExcludedRoute();if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;reconcile();});}
function reconcile(){
 if(syncExcludedRoute())return;
 const root=document.querySelector<HTMLElement>('sl-cijfers');
 if(root!==gradeRoot){gradeObserver?.disconnect();clear();gradeRoot=root;
 if(root){gradeObserver=new MutationObserver(records=>{
 if(isExcludedRoute())return;
 const affected=new Set<HTMLElement>();
 for(const record of records){const target=record.target instanceof Element?record.target:record.target.parentElement;if(target?.closest('.po-overview-status,.po-derived-placeholder'))continue;if(record.type==='attributes'&&target?.closest('.po-safe-native'))continue;
 const owner=target?.closest<HTMLElement>(OWNER);if(owner)affected.add(owner);
 for(const n of record.addedNodes){if(!(n instanceof Element)||n.classList.contains('po-safe-native'))continue;if(n.matches(OWNER))affected.add(n as HTMLElement);n.querySelectorAll<HTMLElement>(OWNER).forEach(x=>affected.add(x));}
 }
 for(const [owner,p] of presentations)if(!owner.isConnected){p.dispose();presentations.delete(owner);}
 for(const owner of affected)if(owner.isConnected)reconcileOwner(owner);
 presentDerived(root);presentOverview(root);
 });gradeObserver.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','title','aria-describedby','aria-labelledby']});}
 }
 if(root){root.querySelectorAll<HTMLElement>(OWNER).forEach(reconcileOwner);presentDerived(root);presentOverview(root);}
 syncInventory();
}
let shellObserver:MutationObserver|null=null,bodyObserver:MutationObserver|null=null;
function setup(){
 if(!document.body)return;
 syncUpdateNotice();
 if(import.meta.env.DEV&&!cssMeasured&&getComputedStyle(document.documentElement).getPropertyValue('--po-shield-installed').trim()==='1'){cssMeasured=true;diagnosticStage('static-css','document',true);}
 const shell=document.querySelector('sl-root');
 if(shell&&!shellObserver){shellObserver=new MutationObserver(records=>{
 if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&(n.matches('sl-cijfers,sl-tab-bar,a[href]')||n.querySelector('sl-cijfers,sl-tab-bar')))))schedule();
 });shellObserver.observe(shell,{subtree:true,childList:true});}
 if(!bodyObserver){bodyObserver=new MutationObserver(records=>{if(isExcludedRoute())return;for(const r of records)for(const n of r.addedNodes)if(n instanceof HTMLElement&&(n.matches('sl-modal,hmy-tooltip')||n.querySelector('sl-modal,hmy-tooltip')))n.querySelectorAll<HTMLElement>('sl-resultaat-item-detail').forEach(diagnose);});bodyObserver.observe(document.body,{childList:true});}
 schedule();
}
const initial=new MutationObserver(()=>{setup();if(document.body&&document.querySelector('sl-root'))initial.disconnect();});initial.observe(document,{subtree:true,childList:true});setup();
const unroute=listenRoutes(()=>{syncUpdateNotice();if(syncExcludedRoute()){schedule();return;}completeCijfersHop();if(!pendingCijfersHop&&history.state?.[INVENTORY_HISTORY]&&location.href===inventoryURL&&!experience.inventoryActive&&!pendingInventory){pendingInventory=true;inventoryTab?.setActive(true);tryStartInventory();window.setTimeout(tryStartInventory,80);window.setTimeout(tryStartInventory,240);}else if(!pendingCijfersHop&&(pendingInventory||experience.inventoryActive)&&(!history.state?.[INVENTORY_HISTORY]||location.href!==inventoryURL))closeInventory(true);if(experience.active&&!experience.inventoryActive&&!document.querySelector('sl-cijfers'))experience.close();schedule();});
const storageListener=(changes:Record<string,chrome.storage.StorageChange>,area:string)=>{
 if(area!=='local'||!changes.poState)return;
 const before=changes.poState.oldValue as Partial<State>|undefined,after=changes.poState.newValue as Partial<State>|undefined;
 if((before?.resetGeneration??0)!==(after?.resetGeneration??0))experience.close();
 void bridge.refresh().catch(()=>{failed=true;schedule();});
};chrome.storage.onChanged.addListener(storageListener);
void bridge.start();
if(import.meta.env.DEV)chrome.runtime.onMessage.addListener((m,_sender,reply)=>{if(m?.protocol==='po/diagnostics')reply(diagnosticReport());});
window.addEventListener('pageshow',event=>{if(event.persisted){void bridge.refresh().catch(()=>{failed=true;schedule();});schedule();}});
window.addEventListener('pagehide',event=>{if(event.persisted){closeInventory(false);experience.close();return;}closeInventory(false);inventoryTab?.remove();inventoryTab=null;initial.disconnect();shellObserver?.disconnect();bodyObserver?.disconnect();gradeObserver?.disconnect();unroute();clear();disposeUpdateNotice();bridge.dispose();experience.dispose();chrome.storage.onChanged.removeListener(storageListener);});
