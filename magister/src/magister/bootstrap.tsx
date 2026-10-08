import './configure-diagnostics';
import type {MagisterUpdate} from './release-update';
import {installDebugPanel} from './debug-panel';
import {debug,errorData} from './debug';
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {Bridge} from '../../../shared/content/bridge';
import {Experience} from '../../../shared/content/experience';
import {listenRoutes} from '../content/route-controller';
import {digest} from '../../../shared/results/identity';
import {validateObservation} from '../../../shared/results/schemas';
import type {ResultRecord,DisplayResult} from '../../../shared/results/types';
import type {State} from '../../../shared/state/schema';
import uiCSS from '../../../shared/ui.css?inline';
import panelCSS from './panel.css?inline';
import {gradeRoute,gradeAnchor,loginVisible,nativeGradeSelector} from './lifecycle';

const disposeDebug=installDebugPanel();
const routeName=()=>isGrades()?'grades':location.hash.startsWith('#/vandaag')?'today':'other';
let mountSignature='';
const isGrades=()=>gradeRoute(location);
const nativeSelector=nativeGradeSelector;
let host:HTMLElement|null=null,root:ReturnType<typeof createRoot>|null=null;
let error='',loading=false,reloadPending=false,disposed=false,generation=0,authenticated=false,hadGradeView=false;
let availableUpdate:MagisterUpdate|null=null,updateChecked=false;
async function checkUpdate(){if(updateChecked||!authenticated)return;updateChecked=true;try{const result=await chrome.runtime.sendMessage({protocol:'po/check-magister-update'}) as MagisterUpdate|null;if(result?.update&&/^\d+\.\d+\.\d+$/.test(result.version)&&result.url===`https://github.com/js664/CijferReveal/releases/tag/v${result.version}`){availableUpdate=result;render();}}catch(reason){debug('update.notice-failed',errorData(reason),'warn');}}
const hidden=new Map<HTMLElement,{inert:boolean;aria:string|null}>();
const bridge=new Bridge(render,()=>{debug('bridge.failed',{},'error');error='Lokale opslag is niet beschikbaar. Laad de pagina opnieuw.';render();},false);
const experience=new Experience(()=>bridge.state,()=>bridge.refresh(),{brand:'Pack Opening voor Magister',preloadAudio:false,keepInteractive:node=>node.hasAttribute('data-po-debug'),visibleResults:()=>new Set([...bridge.records.values()].filter(item=>item.scope===bridge.activeScope&&bridge.state?.records[item.key]?.version===item.version).map(item=>item.key))});
const dates=new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'});
const displayDate=(value:string)=>Number.isFinite(Date.parse(value))?dates.format(new Date(value)):'Datum onbekend';
function Panel(){
 const [inventory,setInventory]=useState(false);
 const live=[...bridge.records.values()].filter(r=>r.scope===bridge.activeScope).sort((a,b)=>Date.parse(b.record.date)-Date.parse(a.record.date)||a.record.id.localeCompare(b.record.id));
 const entries=bridge.state?.collection.filter(e=>e.scope===bridge.activeScope).sort((a,b)=>b.openedAt-a.openedAt)??[];
 function resultRow(display:DisplayResult,opened:boolean){return <div className="result">{opened&&<span className="value">{display.value}</span>}<button className={opened?'':'primary'} onClick={event=>{if(bridge.activeScope)experience.open(display,event.currentTarget,bridge.activeScope);}}>{opened?'Opnieuw openen':'Open cijfer'}</button></div>;}
 return <section className="panel" aria-label="CijferReveal voor Magister"><header><div><h1>{inventory?'Jouw inventory':'Laatste cijfers'}</h1><p className="muted">{inventory?'Je geopende cijfers, bewaard op dit apparaat.':'Open je cijfers met de vertrouwde pack opening.'}</p></div><nav aria-label="CijferReveal"><button aria-pressed={!inventory} onClick={()=>setInventory(false)}>Cijfers</button><button aria-pressed={inventory} onClick={()=>setInventory(true)}>Inventory</button><button disabled={loading} onClick={()=>void load()}>Vernieuwen</button></nav></header>
 {availableUpdate&&<aside className="update-notice" role="status"><strong>Update beschikbaar: {availableUpdate.version}</strong><a href={availableUpdate.url} target="_blank" rel="noopener noreferrer">Update bekijken</a></aside>}
 {error?<div className="status" role="alert"><p>{error}</p><button onClick={()=>location.reload()}>Magister opnieuw laden</button></div>:loading?<p className="status" role="status">Cijfers ophalen…</p>:inventory?<ul>{entries.map(entry=><li key={`${entry.key}:${entry.version}`}><div><strong>{entry.subject}</strong><p className="description">{entry.description}</p><time dateTime={entry.date}>{displayDate(entry.date)}</time></div><span className="value">{entry.value}</span></li>)}{!entries.length&&<li>Je hebt nog geen cijfers geopend.</li>}</ul>:<><ul>{live.map(item=>{const stored=bridge.state?.records[item.key],current=stored?.version===item.version,display=current?stored.display:undefined,opened=stored?.state==='opened';return <li key={item.key}><div><strong>{item.record.subject}</strong><p className="description">{item.record.description}</p><time dateTime={item.record.date}>{displayDate(item.record.date)}</time></div>{display?resultRow(display,opened):<span>Cijfer nog niet gekoppeld</span>}</li>;})}{!live.length&&<li>Geen gekoppelde cijfers. Open Cijfers in Magister en kies Vernieuwen.</li>}</ul><p className="muted" style={{marginTop:20}}>Toont maximaal 25 recente cijfers. Andere Magister-schermen vallen buiten deze versie.</p></>}
 </section>;
}
function render(){if(root&&!disposed)root.render(<Panel/>);}
function restore(){for(const [node,snapshot] of hidden){node.inert=snapshot.inert;if(snapshot.aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',snapshot.aria);}hidden.clear();}
function mount(){
 if(authenticated&&hadGradeView&&loginVisible(document)){authenticated=false;hadGradeView=false;generation++;bridge.records.clear();bridge.activeScope=null;void chrome.runtime.sendMessage({protocol:'po/magister-session-end'}).catch(()=>{});debug('auth.login-view-returned');}
 const anchor=authenticated?gradeAnchor(document,location):null;
 if(!anchor){document.documentElement.removeAttribute('data-po-magister-grades');experience.close();root?.unmount();root=null;host?.remove();host=null;restore();if(mountSignature!=='inactive'){mountSignature='inactive';debug('dom.mount-check',{nativeCount:document.querySelectorAll(nativeSelector).length,parentFound:false,mounted:false,reason:isGrades()?'login-or-container-unavailable':'outside-grade-route'},isGrades()?'warn':'info');}return;}
 const natives=[...document.querySelectorAll<HTMLElement>(nativeSelector)];
 // Follow Magister's native content column. No SOMtoday sidebar/header offsets.
 const parent=anchor.parentElement;
 const signature=JSON.stringify([natives.length,!!parent,!!host?.isConnected]);if(signature!==mountSignature){mountSignature=signature;debug('dom.mount-check',{nativeCount:natives.length,parentFound:!!parent,mounted:!!host?.isConnected},parent?'info':'warn');}
 if(!parent)return;
 if(!host){host=document.createElement('section');host.id='po-magister-panel';const shadow=host.attachShadow({mode:'closed'}),style=document.createElement('style'),content=document.createElement('div');style.textContent=uiCSS+'\n'+panelCSS;shadow.append(style,content);root=createRoot(content);debug('dom.panel-created');}
 if(host.parentElement!==parent||!host.isConnected)parent.insertBefore(host,anchor??null);
 hadGradeView=true;document.documentElement.setAttribute('data-po-magister-grades','');
 for(const node of natives){if(!hidden.has(node))hidden.set(node,{inert:node.inert,aria:node.getAttribute('aria-hidden')});node.inert=true;node.setAttribute('aria-hidden','true');}
 if(signature!==JSON.stringify([natives.length,!!parent,!!host?.isConnected])){const bounds=host.getBoundingClientRect();debug('dom.panel-position',{x:Math.round(bounds.x),y:Math.round(bounds.y),width:Math.round(bounds.width),height:Math.round(bounds.height)});}render();
}
async function load(){
 if(disposed||!authenticated||!isGrades()||!gradeAnchor(document,location)||!bridge.state)return;
 if(loading){reloadPending=true;return;}
 loading=true;error='';render();const requestGeneration=generation;const started=performance.now();debug('content.load-started',{generation});
 try{
  const response=await chrome.runtime.sendMessage({protocol:'po/magister-recent'}) as {ok:boolean;error?:string;userId?:string;records?:ResultRecord[]};
  if(disposed||requestGeneration!==generation||!gradeAnchor(document,location)){debug('content.load-stale',{},'warn');return;}
  if(!response?.ok||!response.userId)throw new Error(response?.error??'Magister is nog niet verbonden. Laad de pagina opnieuw.');
  const scope=await digest(bridge.state.salt,'magister',location.origin,response.userId);
  const observation=validateObservation({protocol:'po/1',scope,surface:'recent',records:response.records,complete:false});
  if(!observation)throw new Error('De cijfergegevens konden niet veilig worden verwerkt.');
  debug('content.observation-validated',{count:observation.records.length});bridge.records.clear();await bridge.ingest(observation);debug('content.load-completed',{records:bridge.records.size,durationMs:Math.round(performance.now()-started)});
 }catch(reason){debug('content.load-failed',errorData(reason),'error');if(requestGeneration===generation){bridge.records.clear();experience.close();error=reason instanceof Error?reason.message:'Cijfers ophalen is niet gelukt.';}}
 finally{loading=false;render();if(reloadPending){reloadPending=false;void load();}}
}
const ready=(message:{protocol?:string})=>{if(message?.protocol!=='po/magister-ready')return;debug('content.auth-ready');authenticated=true;generation++;bridge.records.clear();bridge.activeScope=null;experience.close();mount();render();void load();void checkUpdate();};
chrome.runtime.onMessage.addListener(ready);
const storage=(changes:Record<string,chrome.storage.StorageChange>,area:string)=>{if(area==='local'&&changes.poState){const before=changes.poState.oldValue as State|undefined,after=changes.poState.newValue as State|undefined;if(before?.resetGeneration!==after?.resetGeneration)experience.close();void bridge.refresh().catch(()=>{error='Lokale opslag is niet beschikbaar.';render();});}};
chrome.storage.onChanged.addListener(storage);
const unroute=listenRoutes(()=>{generation++;debug('navigation.changed',{route:routeName()});mount();void load();});
const observer=new MutationObserver(()=>{if(disposed)return;const previous=host;mount();if(host&&!previous)void load();});
observer.observe(document,{subtree:true,childList:true});
debug('navigation.initial',{route:routeName()});void bridge.start().then(()=>{debug('bridge.started',{present:!!bridge.state});mount();void load();});
window.addEventListener('pageshow',event=>{if(event.persisted){mount();void load();}});
window.addEventListener('pagehide',event=>{experience.close();if(event.persisted)return;debug('content.disposed');disposed=true;disposeDebug();observer.disconnect();unroute();chrome.runtime.onMessage.removeListener(ready);chrome.storage.onChanged.removeListener(storage);root?.unmount();host?.remove();restore();bridge.dispose();experience.dispose();});
