import type {ResultRecord} from './types';
import {normalizeGradeValue,parseGrade} from './grade-parser';
import {recordIdentityKey} from './identity';
import {parseSomtodayDate} from './date-parser';
export const normalize=(v:string)=>v.normalize('NFKC').toLocaleLowerCase('nl-NL').replace(/\s+/g,' ').trim();
const dateLabel=(v:string)=>normalize(v).replace(/\b([a-z]+)\./g,'$1').replace(/\b0([1-9])\b/g,'$1');
const calendarDay=(date:Date)=>Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())/86400000;
function weightValue(value:string):string|number{
 const text=normalize(value).replace(/\s*(?:x|×|keer)$/,'');
 return /^\d+(?:[,.]\d+)?$/.test(text)?Number(text.replace(',','.')):text;
}
function sameValue(a:string,b:string){const left=normalizeGradeValue(a),right=normalizeGradeValue(b);if(left===null||right===null)return false;const x=parseGrade(left),y=parseGrade(right);return x!==null&&y!==null?x===y:left===right;}
export function dateVariants(value:string,now=new Date()):string[]{
 const d=parseSomtodayDate(value);if(!Number.isFinite(d.getTime()))return [];
 const days=calendarDay(now)-calendarDay(d);
 // SOMtoday's own formatter uses local calendar days, including DST changes.
 const relative=days===0?['Vandaag']:days===1?['Gisteren']:[];
 return [...new Set([...relative,value.slice(0,10),new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short'}).format(d),new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'short',year:'numeric'}).format(d),new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long'}).format(d),new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'numeric',year:'numeric'}).format(d)])].map(dateLabel);
}
export interface CardTuple { subject:string;subtitle:string;weight:string;value:string;family?:string;kind?:'recent'|'subject';date?:string;description?:string;alternative?:boolean; }
export interface MatchExplanation {candidateCount:number;eligibleCount:number;logicalCount:number;matched:boolean;reason:string;dom:{subject:string;description:string;normalizedDate:string;weight:string;family:string|null};candidates:{family:string;subject:string;description:string;normalizedDate:string;weight:string;testCode:string;columnId:string|null;logicalIdentity:string;attempt:string|null;reason:string}[]}
function rejectReason(tuple:CardTuple,r:ResultRecord):string|null{
 if(tuple.alternative===true&&!r.variant?.startsWith('alternative-'))return 'Kaart toont alternatieve normering; kandidaat niet';
 if(r.aggregate)return 'Samengesteld gemiddelde/resultaat';if((!r.isCijfer&&!r.isLabel)||!normalizeGradeValue(r.value))return 'Geen individueel cijferresultaat';if(!sameValue(tuple.value,r.value))return 'Zichtbare kaartwaarde komt niet overeen';if(weightValue(tuple.weight)!==weightValue(r.weight))return 'Weging komt niet overeen';if(tuple.family&&r.family!==tuple.family)return 'Dossierfamilie komt niet overeen';
 const title=normalize(tuple.subject),subtitle=normalize(tuple.subtitle),description=normalize(r.description);const recent=normalize(r.subject)===title&&(!description||(tuple.description!==undefined?normalize(tuple.description)===description:subtitle.includes(description)));const subject=tuple.kind==='subject'&&(title===description||!!description&&title.startsWith(description+' geïmporteerd uit '));if(!recent&&!subject)return 'Vak/toetsomschrijving komt niet overeen';
 const date=dateLabel(tuple.date??tuple.subtitle);if(r.date&&!dateVariants(r.date).some(candidate=>date===candidate||(tuple.date===undefined&&date.startsWith(candidate)&&/^(?:\s*[•·–—]\s*|\s+-\s*)/.test(date.slice(candidate.length)))))return 'Datum komt niet overeen';if(!r.date&&!(date===''||/^[•·]/.test(date)))return 'Datum ontbreekt of komt niet overeen';return null;
}
export function explainCard(tuple:CardTuple,records:ResultRecord[],logicalKey:(record:ResultRecord)=>string=(r)=>recordIdentityKey(r)):MatchExplanation{
 const candidates=records.map(r=>({record:r,reason:rejectReason(tuple,r)})),eligible=candidates.filter(x=>!x.reason),identities=new Set(eligible.map(x=>logicalKey(x.record)));
 const matched=eligible.length>0&&identities.size===1;const reason=matched?'Eén logische identiteit voldoet aan alle voorwaarden':eligible.length===0?(records.length?'Geen kandidaat voldoet aan alle metadata':'Er zijn geen kandidaten ontvangen'):`${identities.size} verschillende logische identiteiten voldoen; veilig koppelen is niet mogelijk`;
 const normalized=(s:string)=>{const d=parseSomtodayDate(s);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`:'Onbekend';};
 const domDate=candidates.find(x=>!x.reason&&x.record.date)?.record.date;const visibleDate=tuple.date??tuple.subtitle.split(/[•·–—]|\s+-\s+/)[0].trim();const visibleDescription=tuple.kind==='subject'?tuple.subject.trim():tuple.description??tuple.subtitle.split(/[•·–—]|\s+-\s+/).slice(1).join(' ').trim();return {candidateCount:records.length,eligibleCount:eligible.length,logicalCount:identities.size,matched,reason,dom:{subject:tuple.subject.trim()||'Onbekend',description:visibleDescription||'Onbekend',normalizedDate:domDate?normalized(domDate):dateLabel(visibleDate)||'Onbekend',weight:tuple.weight.trim()||'Onbekend',family:tuple.family??null},candidates:candidates.map(({record:r,reason})=>({family:r.family,subject:r.subject,description:r.description,normalizedDate:normalized(r.date),weight:String(weightValue(r.weight)),testCode:r.testCode||'Onbekend',columnId:r.columnId??null,logicalIdentity:logicalKey(r),attempt:r.variant??null,reason:reason??'Metadata komt overeen'}))};
}
export function joinCard(tuple:CardTuple,records:ResultRecord[],logicalKey?:(record:ResultRecord)=>string):ResultRecord|null{
 if(!normalize(tuple.subject))return null;
 const matches=records.filter(r=>!rejectReason(tuple,r));
 const identities=new Set(matches.map(r=>logicalKey?logicalKey(r):recordIdentityKey(r)));
 if(identities.size!==1)return null;
 // Identity equivalence was established by the worker before DOM matching.
 // Prefer the progression presentation, matching SOMtoday's merged-card UI.
 return [...matches].sort((a,b)=>a.family===b.family?recordIdentityKey(a).localeCompare(recordIdentityKey(b)):a.family==='progression'?-1:1)[0];
}
