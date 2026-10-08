import {getCanonicalResultIdentity} from './identity';
import {normalizeGradeValue,parseGrade} from './grade-parser';
import type {Resource} from './resources';
import type {ResultRecord} from './types';
const obj=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const text=(v:unknown,max=300):string=>typeof v==='string'&&v.length<=max?v:typeof v==='number'&&Number.isFinite(v)?String(v):'';
// Match SOMtoday's own gp() formatter, without accepting arbitrary suffixes.
const resultText=(v:unknown)=>text(v,32).trim().replace(/ !$/,'');
const reportTypes=new Set(['PeriodeGemiddeldeKolom','RapportGemiddeldeKolom','RapportCijferKolom','SEGemiddeldeKolom','SECijferKolom','ExamenGemiddeldeKolom','ExamenCijferKolom','ToetssoortGemiddeldeKolom']);
function projectRecord(input:unknown,resource:Resource,aggregate=false):ResultRecord[]{
 const r=obj(input),identity=getCanonicalResultIdentity(r);if(!identity)return [];
 const a=obj(r.additionalObjects),column=obj(a.resultaatkolom);
 const columnInput=column.id??a.resultaatkolom;
 const columnId=typeof columnInput==='number'?Number.isSafeInteger(columnInput)&&columnInput>0?String(columnInput):undefined:typeof columnInput==='string'&&columnInput.length>0&&columnInput.length<=256?columnInput:undefined;
 const firstDate=text(r.datumInvoerEerstePoging,80),date1=text(r.datumInvoerHerkansing1,80),date2=text(r.datumInvoerHerkansing2,80);
 const base:ResultRecord={id:identity.id,selfType:identity.type,type:typeof r.$type==='string'?r.$type:undefined,family:resource.family,value:'',isCijfer:r.isCijfer===true,isLabel:r.isLabel===true,subject:text(a.vaknaam??'Onbekend'),subjectId:text(a.vakuuid,256),description:text(r.omschrijving??'Onbekend'),date:firstDate,weight:text(r.weging??0,40),period:text(r.periode,40),testCode:text(r.toetscode,80),columnType:text(column.type,80)||undefined,columnId,cohortId:text(a.lichtinguuid,256)||undefined,aggregate:aggregate||reportTypes.has(text(r.type,80))||reportTypes.has(text(column.type,80))};
 const variants:ResultRecord[]=[];
 const add=(value:string,date:string,variant?:ResultRecord['variant'])=>{if(value)variants.push({...base,value,date,variant});};
 const first=r.bijzonderheid==='NietGemaakt'?'*':r.bijzonderheid==='TeltNietMee'?'X':r.bijzonderheid==='Vrijstelling'?'vr':resultText(r.formattedEerstePoging);
 const overall=resultText(r.formattedResultaat),retake1=resultText(r.formattedHerkansing1),retake2=resultText(r.formattedHerkansing2);
 // A recent card represents an individual attempt, not necessarily the
 // current overall grade. Keep first-attempt identities compatible with v0.2.
 add(first||(date1||date2||retake1||retake2?'':overall),firstDate);
 add(retake1,date1,'attempt-1');add(retake2,date2,'attempt-2');
 // SOMtoday's recent-result builder emits separate alternative-norming
 // attempts with the same raw result ID and dates (chunk-B26NUKKB.js).
 // Keep them distinct throughout matching, opening and storage.
 if(resource.family==='progression'){
  add(text(r.formattedEerstePogingAlternatief,32).trim(),firstDate,'alternative-first');
  add(text(r.formattedHerkansing1Alternatief,32).trim(),date1,'alternative-attempt-1');
  add(text(r.formattedHerkansing2Alternatief,32).trim(),date2,'alternative-attempt-2');
 }
 const latest=date2||date1||firstDate;
 const sameValue=(a:string,b:string)=>{const left=normalizeGradeValue(a),right=normalizeGradeValue(b);return left!==null&&right!==null&&(left===right||(parseGrade(left)!==null&&parseGrade(left)===parseGrade(right)));};
 if(overall&&!variants.some(attempt=>!attempt.variant?.startsWith('alternative-')&&sameValue(attempt.value,overall)&&attempt.date===latest))add(overall,latest,variants.some(attempt=>!attempt.variant?.startsWith('alternative-'))?'current':undefined);
 return variants;
}
export function projectResponse(body:unknown,resource:Resource):ResultRecord[]{
 const b=obj(body),out:ResultRecord[]=[];
 const add=(v:unknown,aggregate=false)=>{for(const r of projectRecord(v,resource,aggregate)){if(out.length>=2000)return;out.push(r);}};
 if(resource.surface==='recent'||resource.surface==='subject'){if(Array.isArray(b.items))b.items.slice(0,2000).forEach(x=>add(x));}
 if(resource.surface==='overview'&&Array.isArray(b.vakResultaten))for(const v of b.vakResultaten.slice(0,500)){
  const periods=obj(v).perioden;if(!Array.isArray(periods))continue;
  for(const p of periods.slice(0,30)){const period=obj(p);if(Array.isArray(period.resultaten))period.resultaten.slice(0,500).forEach(x=>add(x));for(const name of ['rapportGemiddelde','rapportCijfer','periodeGemiddelde'])if(period[name])add(period[name],true);}
 }
 if(resource.surface==='overview'&&resource.family==='exam'&&Array.isArray(b.items))for(const v of b.items.slice(0,500)){
  const subject=obj(v);if(Array.isArray(subject.resultaten))subject.resultaten.slice(0,500).forEach(x=>add(x));if(subject.seResultaat)add(subject.seResultaat,true);
 }
 if(resource.surface==='averages'&&Array.isArray(b.gemiddelden))for(const g of b.gemiddelden.slice(0,500)){const r=obj(g).voortgangsdossierResultaat;if(r)add(r,true);}
 return out;
}
