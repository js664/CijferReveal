import {newState,defaultSettings,type Settings,type State} from './schema';
import {normalizeGradeValue,parseGrade} from '../somtoday/grade-parser';

const hash=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const lifecycle=new Set(['observed-nonnumeric','baseline','pending','opened','unresolved']);
const displayLimits={subject:300,description:300,date:80,weight:40,value:32} as const;

function validDisplay(display:unknown,key:string,version:string):boolean{
 if(!display||typeof display!=='object')return false;
 const value=display as Record<string,unknown>;
 if(value.key!==key||value.version!==version)return false;
 for(const field of Object.keys(displayLimits) as (keyof typeof displayLimits)[]){
  const fieldValue=value[field];
  if(typeof fieldValue!=='string'||fieldValue.length>displayLimits[field])return false;
 }
 if(normalizeGradeValue(value.value)===null)return false;
 return value.grade===null||(typeof value.grade==='number'&&Number.isFinite(value.grade)&&parseGrade(value.value)===value.grade);
}

function readSettings(value:unknown):Settings{
 const stored=(value&&typeof value==='object'?value:{}) as Partial<Settings>;
 return {
  sound:typeof stored.sound==='boolean'?stored.sound:defaultSettings.sound,
  volume:typeof stored.volume==='number'&&Number.isFinite(stored.volume)&&stored.volume>=0&&stored.volume<=1?stored.volume:defaultSettings.volume,
  motion:stored.motion==='system'||stored.motion==='reduce'?stored.motion:defaultSettings.motion,
 };
}

export function migrate(input:unknown):State{
 if(!input||typeof input!=='object')return newState();
 const s=input as State;
 if(s.schema!==2&&Number(s.schema)!==1)throw new Error('Lokale gegevens hebben een onbekende versie.');
 if(!hash(s.salt)||!s.records||typeof s.records!=='object'||Array.isArray(s.records)||!Array.isArray(s.collection)||!s.coverage||typeof s.coverage!=='object')throw new Error('Lokale gegevens kunnen niet veilig worden gelezen.');
 for(const [key,record] of Object.entries(s.records)){
  if(!record||!hash(key)||record.key!==key||!hash(record.scope)||!hash(record.version)||!lifecycle.has(record.state)||typeof record.numeric!=='boolean'||!Number.isFinite(record.firstSeen)||(record.lastResolvedState!==undefined&&!lifecycle.has(record.lastResolvedState))||(record.display&&!validDisplay(record.display,key,record.version)))throw new Error('Ongeldige lokale resultaatstatus.');
 }
 const resetGeneration=s.resetGeneration??0;
 if(!Number.isSafeInteger(resetGeneration)||resetGeneration<0)throw new Error('Ongeldige resetstatus.');
 const aliases=s.aliases??{};
 if(!aliases||typeof aliases!=='object'||Array.isArray(aliases))throw new Error('Ongeldige lokale koppelingen.');
 for(const [key,alias] of Object.entries(aliases)){
  if(!alias||!hash(key)||!hash(alias.scope)||!hash(alias.rawVersion)||!hash(alias.signature)||!hash(alias.logicalKey)||(alias.proof!==undefined&&!hash(alias.proof))||(alias.openedSignature!==undefined&&!hash(alias.openedSignature))||!['progression','exam'].includes(alias.family)||typeof alias.numeric!=='boolean'||!Number.isFinite(alias.firstSeen))throw new Error('Ongeldige lokale koppeling.');
  if(alias.display&&!validDisplay(alias.display,key,alias.rawVersion))throw new Error('Ongeldige gekoppelde cijferweergave.');
 }
 return {
  ...s,
  schema:2,
  resetGeneration,
  aliases,
  settings:readSettings(s.settings),
  collection:s.collection.filter(entry=>entry&&hash(entry.key)&&hash(entry.version)&&hash(entry.scope)&&validDisplay(entry,entry.key,entry.version)&&Number.isFinite(entry.openedAt)),
 };
}
