import {configureDebug,debug,errorData,subscribeDebug,validDebugEntry,type DebugEntry} from './debug';
import {magisterOrigin} from './provider';
configureDebug('worker');
const key='poMagisterDebugLog';let retained:DebugEntry[]=[],timer:ReturnType<typeof setTimeout>|undefined,diskFailed=false;
let writing=Promise.resolve();
const ready=(async()=>{try{const saved=(await chrome.storage.local.get(key))[key];if(Array.isArray(saved))retained=[...saved.map(validDebugEntry).filter((e):e is DebugEntry=>!!e),...retained].slice(-1500);}catch{debug('debug.history-unavailable',{},'warn');}})();
async function persist(){await ready;const snapshot=[...retained];writing=writing.then(async()=>{try{await chrome.storage.local.set({[key]:snapshot});diskFailed=false;}catch(reason){if(!diskFailed){diskFailed=true;debug('debug.persistence-failed',errorData(reason),'warn');}}});await writing;}
function append(entry:DebugEntry){retained.push(entry);if(retained.length>1500)retained.shift();if(timer===undefined&&!diskFailed)timer=setTimeout(()=>{timer=undefined;void persist();},500);}
subscribeDebug(append);
debug('worker.started');
globalThis.addEventListener('error',event=>debug('runtime.worker-error',errorData(event.error),'error'));
globalThis.addEventListener('unhandledrejection',event=>debug('runtime.worker-rejection',errorData(event.reason),'error'));
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!['po/debug-event','po/debug-snapshot'].includes(message?.protocol))return;
 if(sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab||!magisterOrigin(sender.url??''))return;
 if(message.protocol==='po/debug-event'){const entry=validDebugEntry(message.entry);if(entry&&entry.source==='content')append(entry);return;}
 void (async()=>{await ready;await persist();reply({ok:true,entries:retained.slice(-1500)});})();return true;
});
