import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {configureDebug,debug,errorData,formatDebug,localDebug,subscribeDebug,validDebugEntry,type DebugEntry} from './debug';
const css=`:host{position:fixed;right:16px;bottom:16px;z-index:2147483647;font:13px/1.5 "Segoe UI",sans-serif;color:#eef3fa;color-scheme:dark;width:min(400px,calc(100vw - 32px));pointer-events:none}*{box-sizing:border-box}details{margin-left:auto;pointer-events:auto;background:#182332;border:1px solid #43566d;border-radius:10px;box-shadow:0 8px 28px #0003;width:fit-content;max-width:100%}details[open]{width:100%}summary{cursor:pointer;padding:11px 16px;font-weight:600;user-select:none}section{padding:0 16px 16px}p{margin:0 0 12px;color:#c1c9d4}button{font:inherit;font-weight:600;border:1px solid #86b9f2;background:#86b9f2;color:#101722;padding:8px 12px;border-radius:6px;cursor:pointer}button:disabled{opacity:.65;cursor:wait}button:hover{background:#acd2ff}button:focus-visible,summary:focus-visible{outline:3px solid #acd2ff;outline-offset:3px}.events{margin:12px 0;max-height:min(240px,30vh);overflow:auto;font:12px/1.5 ui-monospace,monospace;overflow-wrap:anywhere}.event{padding:5px 0;border-bottom:1px solid #43566d}.error{color:#ffb4b4}.warn{color:#ffd990}::selection{background:#86b9f2;color:#101722}`;
function DebugPanel({version}:{version:string}){
 const [entries,setEntries]=useState(localDebug),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>subscribeDebug(()=>setEntries(localDebug())),[]);
 async function download(){
  if(busy)return;setBusy(true);setStatus('');debug('debug.export-requested');
  let all=localDebug(),complete=true;
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{const result=await Promise.race([chrome.runtime.sendMessage({protocol:'po/debug-snapshot'}),new Promise<never>((_resolve,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),5000);})]);if(!result?.ok||!Array.isArray(result.entries))throw new Error();const remote=result.entries.map(validDebugEntry).filter((e:DebugEntry|null):e is DebugEntry=>!!e);const unique=new Map<string,DebugEntry>();for(const entry of [...remote,...localDebug()])unique.set(JSON.stringify(entry),entry);all=[...unique.values()].sort((a,b)=>a.time.localeCompare(b.time)).slice(-1500);}catch(reason){complete=false;debug('debug.worker-export-unavailable',errorData(reason),'warn');all=localDebug();}finally{if(timeout!==undefined)clearTimeout(timeout);}
  try{const text=formatDebug(all,version),url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`CijferReveal-Magister-debug-${new Date().toISOString().replace(/[:.]/g,'-')}.txt`;link.click();setTimeout(()=>URL.revokeObjectURL(url),10000);setStatus(complete?'Logbestand gedownload.':'Alleen paginalogs gedownload; achtergrond niet bereikbaar.');debug('debug.export-completed',{count:all.length,bytes:text.length,present:complete});}catch(reason){debug('debug.export-failed',errorData(reason),'error');setStatus('Download mislukt. Probeer het opnieuw.');}finally{setBusy(false);}
 }
 return <details><summary>Debug logs ({entries.length})</summary><section><p>Reproduceer het probleem en download daarna de logs voor je tester. Tokens en cijferwaarden worden niet opgenomen.</p><button disabled={busy} onClick={()=>void download()}>{busy?'Logs verzamelen…':'Download logs (.txt)'}</button><p role="status">{status}</p><div className="events" aria-label="Recente debugmeldingen">{entries.slice(-20).reverse().map((e,i)=><div className={`event ${e.level}`} key={`${e.time}:${i}`}>{e.time.slice(11,19)} {e.level.toUpperCase()} {e.event}<br/>{JSON.stringify(e.data)}</div>)}</div></section></details>;
}
export function installDebugPanel(){
 configureDebug('content');
 const version=chrome.runtime.getManifest().version;
 const forward=subscribeDebug(entry=>{void chrome.runtime.sendMessage({protocol:'po/debug-event',entry}).catch(()=>{});});
 let host:HTMLElement|null=null,root:ReturnType<typeof createRoot>|null=null,enabled=false;
 const mount=()=>{if(!enabled||!document.body||host?.isConnected)return;if(host){document.body.append(host);return;}host=document.createElement('div');host.id='po-magister-debug';host.dataset.poDebug='true';document.body.append(host);const shadow=host.attachShadow({mode:'closed'}),style=document.createElement('style'),content=document.createElement('div');style.textContent=css;shadow.append(style,content);root=createRoot(content);root.render(<DebugPanel version={version}/>);debug('debug.panel-mounted');};
 const toggle=(event:MessageEvent)=>{if(event.source!==window||event.origin!==location.origin||event.data?.protocol!=='po/magister-debug-toggle'||typeof event.data.enabled!=='boolean')return;enabled=event.data.enabled;debug('debug.visibility-changed',{visible:enabled});if(enabled)mount();else{root?.unmount();root=null;host?.remove();host=null;}};
 window.addEventListener('message',toggle);
 const observer=new MutationObserver(mount);observer.observe(document,{childList:true,subtree:true});mount();
 const failure=(event:ErrorEvent)=>debug('runtime.page-error',{...errorData(event.error),line:event.lineno,column:event.colno},'error');
 const rejection=(event:PromiseRejectionEvent)=>debug('runtime.unhandled-rejection',errorData(event.reason),'error');
 window.addEventListener('error',failure);window.addEventListener('unhandledrejection',rejection);
 debug('content.started',{version:chrome.runtime.getManifest().version,online:navigator.onLine,visible:!document.hidden});
 return()=>{forward();observer.disconnect();window.removeEventListener('message',toggle);window.removeEventListener('error',failure);window.removeEventListener('unhandledrejection',rejection);root?.unmount();host?.remove();};
}
