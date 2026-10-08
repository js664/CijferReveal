import {validateObservation} from '../somtoday/schemas';
import {digest,recordIdentityKey} from '../somtoday/identity';
import type {ResultRecord} from '../somtoday/types';
import type {State} from '../state/schema';
import {command} from '../state/repository';
export interface LiveRecord { record:ResultRecord;key:string;scope:string;version:string;rawKey:string;rawVersion:string; }
export class Bridge {
 records=new Map<string,LiveRecord>();activeScope:string|null=null;state:State|null=null;
 private chain=Promise.resolve();private waiting:ReturnType<typeof validateObservation>[]=[];private disposed=false;private suspended=false;
 constructor(private changed:()=>void,private failed:()=>void,private pageObservations=true){}
 private listener=(event:MessageEvent)=>{
 if(event.source!==window||event.origin!==location.origin)return;
 if(this.suspended)return;
 if(event.data?.protocol==='po/ready'){if(this.state)this.hello();return;}
 const message=validateObservation(event.data);if(!message)return;
 this.chain=this.chain.then(()=>this.consume(message)).catch(()=>this.failed());
 };
 start():Promise<void>{
  if(this.pageObservations)window.addEventListener('message',this.listener);
  this.chain=this.chain.then(async()=>{if(this.disposed)return;this.state=await command({kind:'read'});this.hello();const queued=this.waiting.splice(0);for(const m of queued)if(m)await this.consume(m);this.changed();}).catch(()=>this.failed());
  return this.chain;
 }
 private hello(){if(this.state&&this.pageObservations)window.postMessage({protocol:'po/init',salt:this.state.salt},location.origin);}
 private rebind(){for(const live of this.records.values()){const alias=this.state?.aliases?.[live.rawKey],current=alias?.rawVersion===live.rawVersion;live.key=current?alias.logicalKey:live.rawKey;live.version=current?this.state?.records[live.key]?.version??live.rawVersion:live.rawVersion;}}
 private async consume(message:NonNullable<ReturnType<typeof validateObservation>>){
 if(this.disposed||this.suspended)return;
 if(!this.state){if(this.waiting.length<32)this.waiting.push(message);return;}
 const scopeChanged=!!message.scope&&this.activeScope!==message.scope;
 if(message.scope){if(this.activeScope&&this.activeScope!==message.scope){this.records.clear();this.waiting=[];}this.activeScope=message.scope;}
 const inputs:LiveRecord[]=[];
 for(const observed of message.records){
 const known=this.records.get(recordIdentityKey(observed));
 // Overview context cannot be assumed to be account identity; correlate with an already scoped record.
 const scope=message.scope??known?.scope;if(!scope)continue;
 // Unscoped overview/average responses cannot prove account identity or a
 // revision. Retain the latest canonical scoped response for a known result.
 const record=message.scope&&message.surface!=='overview'?observed:known?.record??observed;
 const key=record.variant?await digest(this.state.salt,scope,record.family,record.id,record.variant):await digest(this.state.salt,scope,record.family,record.id);
 const version=await digest(this.state.salt,'version',record.value,record.weight,record.description,record.date,record.period,record.testCode,record.columnType??'',record.selfType,record.subject,record.subjectId,String(record.isCijfer),String(record.isLabel),String(record.aggregate));
 const live={record,key,scope,version,rawKey:key,rawVersion:version};inputs.push(live);this.records.set(recordIdentityKey(record),live);
 }
 if(!message.scope&&inputs.length<message.records.length&&this.waiting.length<32)this.waiting.push(message);
 if(inputs.length){this.state=await command({kind:'observe',inputs,scope:message.scope??inputs[0].scope,surface:message.surface});this.rebind();this.changed();}
 else if(scopeChanged)this.changed();
 if(message.scope&&this.waiting.length){const pending=this.waiting.splice(0);for(const p of pending)if(p)await this.consume(p);}
 }
 ingest(message:NonNullable<ReturnType<typeof validateObservation>>):Promise<void>{
  const task=this.chain.then(()=>this.consume(message));this.chain=task.catch(()=>this.failed());return task;
 }
 refresh():Promise<void>{
  // Storage refreshes and network observations share one queue. Otherwise a
  // delayed read can overwrite the state of a freshly detected grade.
  const task=this.chain.then(async()=>{if(this.disposed)return;const next=await command({kind:'read'});if(this.state?.salt!==next.salt){this.records.clear();this.activeScope=null;this.waiting=[];}this.state=next;this.rebind();this.hello();this.changed();});
  this.chain=task.catch(()=>{});return task;
 }
 // A route suspension stops observations while Vakgemiddelden is visible, but
 // keep the last scoped snapshot in this document. SOMtoday often reuses its
 // SPA view when returning to Laatste cijfers and does not refetch the result
 // endpoint; dropping the snapshot would turn valid cards into false
 // "Cijfer nog niet gekoppeld" states until the user reloads.
 pause(){this.suspended=true;this.waiting=[];window.postMessage({protocol:'po/disable'},location.origin);}
 resume(){if(!this.suspended)return;this.suspended=false;void this.refresh().catch(()=>this.failed());}
 dispose(){this.disposed=true;window.removeEventListener('message',this.listener);this.records.clear();}
}
