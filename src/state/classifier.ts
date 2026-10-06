import {normalizeGradeValue,parseGrade} from '../somtoday/grade-parser';
import type {ValidationProfile} from '../somtoday/validation-profile';
import type {ResultRecord,DisplayResult,Surface} from '../somtoday/types';
import {defaultSettings,type State} from './schema';
export interface ClassifiedInput { record:ResultRecord;key:string;scope:string;version:string; }
export function classify(state:State,input:ClassifiedInput,_profile:ValidationProfile,now=Date.now()):void{
 const {record:r,key,scope,version}=input,previous=state.records[key],grade=parseGrade(r.value),displayValue=normalizeGradeValue(r.value);
 const numeric=grade!==null&&r.isCijfer&&!r.isLabel&&!r.aggregate;
 const individual=(r.isCijfer||r.isLabel)&&!r.aggregate&&displayValue!==null;
 // Upgrade legacy observed stars without resetting already opened packs.
 if(previous?.version===version&&(previous.state==='opened'||previous.state==='pending'&&previous.display))return;
 let status:'observed-nonnumeric'|'baseline'|'pending'|'unresolved'='unresolved';
 // Any non-empty individual result (numeric or textual) can be opened. This
 // includes letter grades and Unicode labels from SOMtoday, even on first install.
 // Existing collection entries are immutable snapshots, including revisions.
 if(individual)status='pending';
 const display:DisplayResult|undefined=individual&&status!=='unresolved'?{key,version,subject:r.subject,description:r.description,date:r.date,weight:r.weight,value:r.value.trim(),grade}:undefined;
 state.records[key]={key,scope,version,state:status,numeric,firstSeen:previous?.firstSeen??now,lastResolvedState:!numeric&&status==='pending'?'observed-nonnumeric':status==='unresolved'?previous?.lastResolvedState??previous?.state:status,display};
}
export function noteCoverage(state:State,scope:string,surface:Surface,profile:ValidationProfile){
 const c=state.coverage[scope]??{overview:false,subject:false,armed:false};
 if(surface==='overview')c.overview=true;if(surface==='subject')c.subject=true;
 c.armed=c.armed||(profile.numericValidated&&profile.baselineCoverageValidated&&c.overview&&c.subject);
 state.coverage[scope]=c;
}
export function queue(state:State,scope:string){return Object.values(state.records).filter(r=>r.scope===scope&&r.state==='pending'&&r.display).sort((a,b)=>a.firstSeen-b.firstSeen||a.key.localeCompare(b.key));}
export function markOpened(state:State,key:string,version:string,scope:string,now=Date.now(),generation=state.resetGeneration){
 const r=state.records[key];if(generation!==state.resetGeneration||!r||r.scope!==scope||r.state!=='pending'||r.version!==version||!r.display)throw new Error('Cijfer is gewijzigd. Opnieuw controleren.');
 r.state='opened';state.collection.push({...r.display,scope,openedAt:now});
 for(const alias of Object.values(state.aliases))if(alias.scope===scope&&alias.logicalKey===key)alias.openedSignature=alias.signature;
}
/** Undo only the just-started first opening when its animation is cancelled. */
export function cancelOpened(state:State,key:string,version:string,scope:string,generation=state.resetGeneration){
 const r=state.records[key];
 if(generation!==state.resetGeneration||!r||r.scope!==scope||r.state!=='opened'||r.version!==version||!r.display)throw new Error('Deze opening kan niet worden teruggedraaid.');
 const entry=state.collection.findIndex(item=>item.scope===scope&&item.key===key&&item.version===version);
 if(entry<0)throw new Error('De geopende kaart is niet gevonden.');
 state.collection.splice(entry,1);r.state='pending';
 for(const alias of Object.values(state.aliases))if(alias.scope===scope&&alias.logicalKey===key&&alias.openedSignature===alias.signature)delete alias.openedSignature;
}
export function resetOpenedResults(state:State){
 // Keep identities and observations so already loaded pages can reopen packs
 // immediately. A fresh salt would discard those mappings until a new GET.
 state.resetGeneration++;
 state.collection=[];state.coverage={};state.settings={...defaultSettings};
 for(const alias of Object.values(state.aliases))delete alias.openedSignature;
 for(const r of Object.values(state.records)){
  if(['opened','baseline','pending','observed-nonnumeric'].includes(r.state)){
   r.state=r.display?'pending':'unresolved';r.lastResolvedState=r.numeric?'pending':'observed-nonnumeric';
  }
 }
}
export function collection(state:State,scope:string){return state.collection.filter(r=>r.scope===scope).sort((a,b)=>b.openedAt-a.openedAt||a.key.localeCompare(b.key));}
