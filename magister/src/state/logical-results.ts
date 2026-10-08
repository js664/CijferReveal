import {digest} from '../somtoday/identity';
import {parseSomtodayDate} from '../somtoday/date-parser';
import {normalizeGradeValue,parseGrade} from '../somtoday/grade-parser';
import {classify,type ClassifiedInput} from './classifier';
import {LIVE_PROFILE} from '../somtoday/validation-profile';
import type {State,StoredAlias} from './schema';

const text=(value:string)=>value.normalize('NFKC').replace(/\s+/g,' ').trim();
const number=(value:string)=>{const cleaned=text(value).replace(/\s*(?:x|×|keer)$/,'').replace(',','.');return /^\d+(?:\.\d+)?$/.test(cleaned)?String(Number(cleaned)):cleaned;};
function wallDate(value:string){const d=parseSomtodayDate(value);return Number.isFinite(d.getTime())?JSON.stringify([d.getFullYear(),d.getMonth(),d.getDate(),d.getHours(),d.getMinutes(),d.getSeconds(),d.getMilliseconds()]):value;}

/** The worker owns canonicalization; page-supplied aliases/keys are not trusted. */
export async function observeLogicalResults(state:State,inputs:ClassifiedInput[],now=Date.now()){
 const oldRecords={...state.records},owned=new Set<string>();
 for(const [key,a] of Object.entries(state.aliases)){owned.add(key);owned.add(a.logicalKey);}
 for(const input of inputs){
  const r=input.record,scratch:State={...state,records:{}};classify(scratch,input,LIVE_PROFILE,now);
  const projected=scratch.records[input.key],previous=state.aliases[input.key];owned.add(input.key);
  // Column identity is explicit API identity, not a subject/test-code guess.
  const proof=projected.display&&r.columnId&&r.subjectId?await digest(state.salt,'logical-column',input.scope,r.subjectId,r.columnId,r.cohortId??'',r.variant??'first'):undefined;
  const signature=await digest(state.salt,'logical-snapshot',proof??input.key,text(r.subject),text(r.description),wallDate(r.date),number(r.weight),String(parseGrade(r.value)??normalizeGradeValue(r.value)??r.value),r.period,r.testCode,r.columnType??'',String(r.isCijfer),String(r.isLabel),String(r.aggregate));
  const legacyOpened=!previous&&((oldRecords[input.key]?.scope===input.scope&&oldRecords[input.key]?.version===input.version&&oldRecords[input.key]?.state==='opened')||state.collection.some(c=>c.scope===input.scope&&c.key===input.key&&c.version===input.version));
  state.aliases[input.key]={scope:input.scope,family:r.family,rawVersion:input.version,proof,signature,logicalKey:input.key,numeric:projected.numeric,firstSeen:previous?.firstSeen??oldRecords[input.key]?.firstSeen??now,display:projected.display,openedSignature:legacyOpened?signature:previous?.openedSignature};
 }
 const buckets=new Map<string,[string,StoredAlias][]>();
 for(const entry of Object.entries(state.aliases)){const id=entry[1].proof??entry[0];const bucket=buckets.get(id)??[];bucket.push(entry);buckets.set(id,bucket);}
 const targets=new Set<string>();
 for(const members of buckets.values()){
  const first=members[0][1];
  const equivalent=!!first.proof&&members.every(([,a])=>a.scope===first.scope&&a.signature===first.signature)&&new Set(members.map(([,a])=>a.family)).size===members.length;
  // Conflicts or two distinct records from the same dossier stay separate.
  const groups=equivalent?[members]:members.map(member=>[member]);
  for(const group of groups){
   const canonical=equivalent?first.proof!:group[0][0];
   const version=equivalent?await digest(state.salt,'logical-version',canonical,first.signature):group[0][1].rawVersion;
   const representative=[...group].sort((a,b)=>a[1].family===b[1].family?a[0].localeCompare(b[0]):a[1].family==='progression'?-1:1)[0][1];
   const display=representative.display?{...representative.display,key:canonical,version}:undefined;
   const existing=oldRecords[canonical];
   const opened=group.some(([,a])=>a.openedSignature===a.signature)||(equivalent&&existing?.scope===representative.scope&&existing.version===version&&existing.state==='opened')||(equivalent&&state.collection.some(c=>c.scope===representative.scope&&c.key===canonical&&c.version===version));
   for(const [rawKey,a] of group){
    a.logicalKey=canonical;
    if(opened)a.openedSignature=a.signature;
    // Upgrade only archives correlated to this exact raw identity/version.
    if(equivalent)for(const entry of state.collection)if(entry.scope===a.scope&&entry.key===rawKey&&entry.version===a.rawVersion){entry.key=canonical;entry.version=version;}
   }
   targets.add(canonical);
   state.records[canonical]={key:canonical,scope:representative.scope,version,state:display?opened?'opened':'pending':'unresolved',numeric:representative.numeric,firstSeen:Math.min(...group.map(([,a])=>a.firstSeen)),display};
  }
 }
 for(const key of owned)if(!targets.has(key))delete state.records[key];
 const archive=new Map<string,State['collection'][number]>();
 for(const entry of state.collection){const id=JSON.stringify([entry.scope,entry.key,entry.version]),previous=archive.get(id);if(!previous||entry.openedAt<previous.openedAt)archive.set(id,entry);}
 state.collection=[...archive.values()];
}
