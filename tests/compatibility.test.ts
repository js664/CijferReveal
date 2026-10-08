import {it,expect} from 'vitest';
import {dateVariants,joinCard} from '../src/somtoday/dom-join';
import {projectResponse} from '../src/somtoday/projection';
import {matchResource} from '../src/somtoday/resources';
import {parseSomtodayDate} from '../shared/results/date-parser';
import {record,rawRecord} from './fixtures';
const resource=matchResource('https://api.somtoday.nl/rest/v1/geldendvoortgangsdossierresultaten/leerling/another-student','https://leerling.somtoday.nl')!;
const tuple={subject:'Wiskunde A',subtitle:'4 okt • Hoofdstuk 3',weight:'2x',value:'8,3'};
it.each([['Vandaag',0],['Gisteren',1]] as const)('a single fresh grade labelled %s matches on any account', (label,offset)=>{
 const date=new Date();date.setHours(12,0,0,0);date.setDate(date.getDate()-offset);
 expect(joinCard({...tuple,subtitle:`${label} • Hoofdstuk 3`},[record({date:date.toISOString()})])?.id).toBe('fixture-result-a');
});
it('relative dates use calendar days across daylight-saving changes',()=>{
 expect(dateVariants(new Date(2026,9,25,12).toISOString(),new Date(2026,9,26,12))).toContain('gisteren');
});
it('description text cannot masquerade as the date, and an explicit year must match',()=>{
 expect(joinCard({...tuple,subtitle:'5 okt • Gisteren Hoofdstuk 3'},[record()])).toBeNull();
 expect(joinCard({...tuple,subtitle:'4 okt 2025 • Hoofdstuk 3'},[record()])).toBeNull();
});
it('real subject-page cards use the test title and a date-only subtitle',()=>{
 expect(joinCard({...tuple,kind:'subject',subject:'Hoofdstuk 3',subtitle:'4 okt'},[record()])?.id).toBe('fixture-result-a');
 expect(joinCard({...tuple,kind:'subject',subject:'Andere toets',subtitle:'4 okt'},[record()])).toBeNull();
});
it('two identical-looking subjects still require a unique match',()=>{
 expect(joinCard({...tuple,kind:'subject',subject:'Hoofdstuk 3',subtitle:'4 okt'},[record(),record({id:'another',subject:'Engels',subjectId:'other-subject'})])).toBeNull();
});
it('SOMtoday merged progression/exam cards collapse only with a proven shared column identity',()=>{
 const a=record({columnId:'shared-column'}),b=record({id:'exam-result',family:'exam',selfType:'resultaten.RGeldendExamendossierResultaat',type:'resultaten.RGeldendExamendossierResultaat',columnId:'shared-column'});
 expect(joinCard(tuple,[b,a])).toBeNull();
 expect(joinCard(tuple,[b,a],()=> 'verified-worker-identity')).toBe(a);
 expect(joinCard(tuple,[a,{...b,columnId:'different-column'}])).toBeNull();
 expect(joinCard(tuple,[{...a,columnId:undefined},{...b,columnId:undefined}])).toBeNull();
});
it('first attempt and retake preserve their own grades and dates, even when the current grade differs',()=>{
 const records=projectResponse({items:[rawRecord({formattedResultaat:'6,0',formattedEerstePoging:'4,0',formattedHerkansing1:'8,0',datumInvoerEerstePoging:'2026-09-29T10:00:00+02:00',datumInvoerHerkansing1:'2026-10-04T10:00:00+02:00'})]},resource);
 expect(records.map(r=>[r.variant,r.value,r.date.slice(0,10)])).toEqual([[undefined,'4,0','2026-09-29'],['attempt-1','8,0','2026-10-04'],['current','6,0','2026-10-04']]);
 expect(joinCard({...tuple,subtitle:'29 sep • Hoofdstuk 3',value:'4,0'},records)?.variant).toBeUndefined();
 expect(joinCard({...tuple,value:'8,0'},records)?.variant).toBe('attempt-1');
 expect(joinCard({...tuple,kind:'subject',subject:'Hoofdstuk 3',subtitle:'4 okt',value:'6,0'},records)?.variant).toBe('current');
});
it('an ordinary first attempt keeps the existing result identity and emits no duplicate pack',()=>{
 const records=projectResponse({items:[rawRecord({formattedResultaat:'8,3',formattedEerstePoging:'8,3'})]},resource);
 expect(records).toHaveLength(1);expect(records[0]).toMatchObject({id:'fixture-result-a',value:'8,3'});expect(records[0].variant).toBeUndefined();
});
it('numeric formatting markers are removed exactly as SOMtoday does, without loosening the grade parser',()=>{
 expect(projectResponse({items:[rawRecord({formattedResultaat:'7,2 !'})]},resource)[0].value).toBe('7,2');
 expect(projectResponse({items:[rawRecord({formattedResultaat:'7,2x'})]},resource)[0].value).toBe('7,2x');
});
it('individual stars remain stars and report-column values never become packs',()=>{
 const star=projectResponse({items:[rawRecord({formattedResultaat:'*',bijzonderheid:'NietGemaakt'})]},resource);
 expect(star).toHaveLength(1);expect(star[0].value).toBe('*');
 const report=projectResponse({items:[rawRecord({formattedResultaat:'8,3',type:'RapportCijferKolom'})]},resource);
 expect(report[0].aggregate).toBe(true);expect(joinCard(tuple,report)).toBeNull();
});
it.each(['O','V','G','好','🧪','e\u0301'])('projects and joins a displayed Unicode grade %s',value=>{
 const records=projectResponse({items:[rawRecord({formattedResultaat:value,isCijfer:false,isLabel:true})]},resource);
 expect(records).toHaveLength(1);
 expect(joinCard({...tuple,value},records)?.value).toBe(value);
});
it.each(['O','V','G','好','🧪','e\u0301'])('matches a Unicode label on a subject result card: %s',value=>{
 const records=projectResponse({items:[rawRecord({formattedResultaat:value,isCijfer:false,isLabel:true})]},{...resource,surface:'subject'});
 expect(joinCard({...tuple,kind:'subject',subject:'Hoofdstuk 3',subtitle:'4 okt',value},records)?.value).toBe(value);
});
it('both overview routes use the same student scope as the recent-result routes',()=>{
 for(const dossier of ['voortgangs','examen'])expect(matchResource(`/rest/v1/geldend${dossier}dossierresultaten/leerling/cijferoverzicht/another-student`,'https://leerling.somtoday.nl')).toMatchObject({surface:'overview',scopeInput:'another-student',family:dossier==='examen'?'exam':'progression'});
});
it('real progression subject URLs include the s in voortgangsdossier',()=>{
 expect(matchResource('/rest/v1/geldendvoortgangsdossierresultaten/vakresultaten/another-student/vak/another-subject/lichting/another-cohort','https://leerling.somtoday.nl')).toMatchObject({surface:'subject',scopeInput:'another-student',family:'progression'});
 expect(matchResource('/rest/v1/geldendvoortgangdossierresultaten/vakresultaten/another-student/vak/another-subject/lichting/another-cohort','https://leerling.somtoday.nl')).toBeNull();
});
it('missing metadata uses SOMtoday’s actual Onbekend and zero-weight defaults',()=>{
 const records=projectResponse({items:[rawRecord({formattedResultaat:'7,2',omschrijving:null,weging:null,additionalObjects:{}})]},resource);
 expect(joinCard({subject:'Onbekend',subtitle:'4 okt • Onbekend',weight:'0x',value:'7,2'},records)?.value).toBe('7,2');
});
it.each(['2026-10-01T00:15:00+02:00','2026-10-01T23:45:00Z'])('school grade dates preserve their wall-clock day: %s',value=>{
 const date=parseSomtodayDate(value);expect(date.getFullYear()).toBe(2026);expect(date.getMonth()).toBe(9);expect(date.getDate()).toBe(1);
 expect(dateVariants(value)).toContain('1 okt');
});
it.each([' • ',' · ',' - ',' – '])('the reported October 1 card supports the actual date separator %s',separator=>{
 expect(joinCard({subject:'Nederlands',subtitle:`1 okt${separator}Leesstrategieën`,weight:'4x',value:'6,3'},[record({subject:'Nederlands',description:'Leesstrategieën',date:'2026-10-01T00:15:00+02:00',weight:'4',value:'6,3'})])?.value).toBe('6,3');
});
