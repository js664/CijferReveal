import type {Observation,ResultRecord} from './types';
const bounded=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max;
export function validRecord(v:unknown):v is ResultRecord{
 if(!v||typeof v!=='object')return false;const r=v as ResultRecord;
 return bounded(r.id,256)&&r.id.length>0&&bounded(r.selfType,160)&&r.selfType.startsWith('resultaten.')&&(!r.type||r.type===r.selfType)&&['progression','exam'].includes(r.family)&&bounded(r.value,32)&&typeof r.isCijfer==='boolean'&&typeof r.isLabel==='boolean'&&typeof r.aggregate==='boolean'&&bounded(r.subject,300)&&bounded(r.subjectId,256)&&bounded(r.description,300)&&bounded(r.date,80)&&bounded(r.weight,40)&&bounded(r.period,40)&&bounded(r.testCode,80)&&(r.columnType===undefined||bounded(r.columnType,80))&&(r.columnId===undefined||bounded(r.columnId,256))&&(r.cohortId===undefined||bounded(r.cohortId,256))&&(r.variant===undefined||['attempt-1','attempt-2','current','alternative-first','alternative-attempt-1','alternative-attempt-2'].includes(r.variant));
}
export function validateObservation(v:unknown):Observation|null{
 if(!v||typeof v!=='object')return null;const m=v as Observation;
 if(m.protocol!=='po/1'||!['recent','subject','overview','averages','exam-context','publication'].includes(m.surface)||m.complete!==false||!(m.scope===null||typeof m.scope==='string'&&/^[a-f0-9]{64}$/.test(m.scope))||!Array.isArray(m.records)||m.records.length>2000||!m.records.every(validRecord))return null;
 // Reconstruct explicit fields; discard all extra properties at the trust boundary.
 return {protocol:'po/1',surface:m.surface,scope:m.scope,complete:false,records:m.records.map(r=>({id:r.id,selfType:r.selfType,type:r.type,family:r.family,value:r.value,isCijfer:r.isCijfer,isLabel:r.isLabel,subject:r.subject,subjectId:r.subjectId,description:r.description,date:r.date,weight:r.weight,period:r.period,testCode:r.testCode,columnType:r.columnType,columnId:r.columnId,cohortId:r.cohortId,variant:r.variant,aggregate:r.aggregate}))};
}
