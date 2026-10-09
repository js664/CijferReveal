import type {ResultRecord} from '../../../shared/results/types';
import {parseGrade,normalizeGradeValue} from '../../../shared/results/grade-parser';
import {validRecord} from '../../../shared/results/schemas';
import {debug} from './debug';

export function magisterOrigin(value:string):string|null {
 try {const url=new URL(value);return url.protocol==='https:'&&/^[a-z0-9-]+\.magister\.net$/i.test(url.hostname)&&!url.username&&!url.password&&!url.port?url.origin:null;}catch{return null;}
}
export function personRequest(value:string):{origin:string;userId:string}|null {
 const origin=magisterOrigin(value);if(!origin)return null;
 const match=new URL(value).pathname.match(/^\/api\/personen\/([1-9]\d*)\//i);
 return match?{origin,userId:match[1]}:null;
}
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const text=(v:unknown,max=300)=>typeof v==='string'&&v.length<=max?v.trim():'';
const identifier=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0?String(v):typeof v==='string'&&/^[1-9]\d{0,19}$/.test(v)?v:null;
/** Recent endpoint only. The account/tenant scope owns column IDs; no text matching. */
export function parseRecent(payload:unknown):ResultRecord[] {
 if(!object(payload)||!Array.isArray(payload.items)||payload.items.length>2000){debug('parser.invalid-envelope',{reason:!object(payload)?'not-object':!Array.isArray(payload.items)?'items-missing':'too-many-items'},'error');throw new Error('Onbekend Magister-antwoord.');}
 debug('parser.started',{received:payload.items.length});
 const counts=new Map<string,number>();
 for(const item of payload.items)if(object(item)){const id=identifier(item.kolomId);if(id)counts.set(id,(counts.get(id)??0)+1);}
 const records:ResultRecord[]=[];
 for(const [index,item] of payload.items.entries()){
  if(!object(item)||!object(item.vak)){debug('parser.row-rejected',{index,reason:'subject-object-missing'},'warn');continue;}
  const id=identifier(item.kolomId),value=text(item.waarde,32),subject=text(item.vak.omschrijving),date=text(item.ingevoerdOp,80);
  if(!id||counts.get(id)!==1||!subject||!date||!Number.isFinite(Date.parse(date))||!normalizeGradeValue(value)){debug('parser.row-rejected',{index,reason:!id?'invalid-column-id':counts.get(id)!==1?'duplicate-column-id':!subject?'subject-missing':!date||!Number.isFinite(Date.parse(date))?'invalid-date':'empty-value'},'warn');continue;}
  const weight=typeof item.weegfactor==='number'&&Number.isFinite(item.weegfactor)&&item.weegfactor>=0?String(item.weegfactor):text(item.weegfactor,40);
  const record:ResultRecord={id:`recent:${id}`,family:'progression',selfType:'resultaten.MagisterRecent',columnId:id,value,isCijfer:parseGrade(value)!==null,isLabel:parseGrade(value)===null,subject,subjectId:'',description:text(item.omschrijving),date,weight,period:'',testCode:'',aggregate:false};
  if(validRecord(record))records.push(record);else debug('parser.row-rejected',{index,reason:'record-validation'},'warn');
 }
 debug('parser.completed',{received:payload.items.length,accepted:records.length,rejected:payload.items.length-records.length});return records;
}
