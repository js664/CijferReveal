export type DebugLevel='info'|'warn'|'error';
export type DebugEntry={time:string;source:'content'|'worker';level:DebugLevel;event:string;data:Record<string,string|number|boolean>};
const fields=new Set(['reason','stage','status','durationMs','count','received','accepted','rejected','index','field','type','present','changed','tab','frame','route','width','height','x','y','nativeCount','parentFound','mounted','records','collection','pending','opened','generation','kind','replay','position','total','reduced','sound','state','asset','errorName','issue','line','column','version','online','visible','dropped','bytes']);
const entries:DebugEntry[]=[];const subscribers=new Set<(entry:DebugEntry)=>void>();
let source:DebugEntry['source']='content',enabled=false;
export function configureDebug(next:DebugEntry['source']){source=next;enabled=true;}
/** Only bounded, explicitly named metadata enters logs. Never serialize payloads. */
export function safeData(value:unknown):DebugEntry['data']{
 const data:DebugEntry['data']={};if(!value||typeof value!=='object'||Array.isArray(value))return data;
 for(const [key,item] of Object.entries(value))if(fields.has(key)){
  if(typeof item==='boolean'||typeof item==='number'&&Number.isFinite(item))data[key]=item;
  else if(typeof item==='string'&&/^[a-zA-Z0-9_.:/ -]{0,120}$/.test(item)&&!/(?:bearer|token|cookie|https?:|@)/i.test(item))data[key]=item;
 }
 return data;
}
export function errorData(error:unknown){
 const name=error instanceof Error?error.name:'UnknownError';
 const errorName=['Error','TypeError','RangeError','SyntaxError','AbortError','TimeoutError','SecurityError','NotAllowedError','QuotaExceededError','InvalidStateError'].includes(name)?name:'UnknownError';
 const message=error instanceof Error?error.message:'';
 const issue=/fetch|network/i.test(message)?'network':/context invalidated|receiving end|message port/i.test(message)?'extension-connection':/quota/i.test(message)?'quota':/json/i.test(message)?'json':/abort|timeout/i.test(message)?'timeout':'unspecified';
 return {errorName,issue};
}
export function debug(event:string,data:unknown={},level:DebugLevel='info'){
 if(!/^[a-z][a-z0-9.-]{0,79}$/.test(event))return;
 const entry:DebugEntry={time:new Date().toISOString(),source,level,event,data:safeData(data)};
 entries.push(entry);if(entries.length>1500)entries.shift();
 if(enabled){const method=level==='error'?'error':level==='warn'?'warn':'info';console[method]('[CijferReveal Magister]',entry.event,entry.data);}
 for(const notify of subscribers)try{notify(entry);}catch{/* Diagnostics cannot break the extension. */}
}
export function subscribeDebug(notify:(entry:DebugEntry)=>void){subscribers.add(notify);return()=>{subscribers.delete(notify);};}
export function localDebug(){return [...entries];}
export function validDebugEntry(value:unknown):DebugEntry|null{
 if(!value||typeof value!=='object')return null;const e=value as DebugEntry;
 if(typeof e.time!=='string'||!/^\d{4}-\d\d-\d\dT/.test(e.time)||!Number.isFinite(Date.parse(e.time))||!['content','worker'].includes(e.source)||!['info','warn','error'].includes(e.level)||typeof e.event!=='string'||!/^[a-z][a-z0-9.-]{0,79}$/.test(e.event))return null;
 return {time:e.time,source:e.source,level:e.level,event:e.event,data:safeData(e.data)};
}
export function formatDebug(entries:DebugEntry[],version:string){return `CijferReveal Magister diagnostic log\nVersion: ${/^\d+\.\d+\.\d+$/.test(version)?version:'unknown'}\nExported: ${new Date().toISOString()}\nTimes are UTC. Most recent 1500 retained events; no credentials, grade values, names, raw API bodies or page HTML.\n\n`+entries.map(e=>`${e.time} [${e.source}] [${e.level.toUpperCase()}] ${e.event} ${JSON.stringify(e.data)}`).join('\n')+'\n';}
