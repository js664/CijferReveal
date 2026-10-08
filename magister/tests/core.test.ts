import {describe,it,expect} from 'vitest';
import {parseGrade} from '../src/somtoday/grade-parser';
import {getCanonicalResultIdentity,digest} from '../src/somtoday/identity';
import {projectResponse} from '../src/somtoday/projection';
import {matchResource} from '../src/somtoday/resources';
import {validateObservation} from '../src/somtoday/schemas';
import {joinCard} from '../src/somtoday/dom-join';
import {rawRecord,record} from './fixtures';
const origin='https://leerling.somtoday.nl';
describe('whole-string Dutch parser',()=>{
 it.each([['8,3',8.3],['5,5',5.5],['10',10],['10,0',10],['1',1],['4,8',4.8],['6,3',6.3],['7,8',7.8],['8,9',8.9],['9,7',9.7],['6.8',6.8],['6,75',6.75],['8,30',8.3],[' 8,3 ',8.3],['\u00a08,3\u00a0',8.3],['６，３',6.3]])('accepts fixture %s',(input,want)=>expect(parseGrade(input)).toBe(want));
 it.each(['*','',' ','-','voldoende','8,3x','x8,3','0','11','10,1','8,333','+8','8%','8e0','8/10'])('rejects %j',v=>expect(parseGrade(v)).toBeNull());
});
describe('canonical self',()=>{
 it('one self, not array order',()=>expect(getCanonicalResultIdentity({...rawRecord(),links:[{rel:'koppeling',id:'wrong'},...rawRecord().links]})?.id).toBe('fixture-result-a'));
 it('no self',()=>expect(getCanonicalResultIdentity({...rawRecord(),links:[]})).toBeNull());
 it('ambiguous self',()=>expect(getCanonicalResultIdentity({...rawRecord(),links:[...rawRecord().links,...rawRecord().links]})).toBeNull());
 it('type disagreement',()=>expect(getCanonicalResultIdentity(rawRecord({$type:'different'}))).toBeNull());
 it('overview without top-level type',()=>expect(getCanonicalResultIdentity(rawRecord({$type:undefined}))).not.toBeNull());
 it('normalizes live numeric self IDs consistently with string IDs',()=>{const type=rawRecord().$type;const numeric=getCanonicalResultIdentity(rawRecord({links:[{rel:'self',id:1234567890123,type}]}));expect(numeric).toEqual({id:'1234567890123',type});expect(numeric).toEqual(getCanonicalResultIdentity(rawRecord({links:[{rel:'self',id:'1234567890123',type}]})));});
 it.each([0,-1,1.5,NaN,Infinity,Number.MAX_SAFE_INTEGER+1])('rejects unsafe numeric self ID %s',id=>expect(getCanonicalResultIdentity(rawRecord({links:[{rel:'self',id,type:rawRecord().$type}]}))).toBeNull());
 it('uses the verified individual-result koppeling fallback when self is absent',()=>expect(getCanonicalResultIdentity({...rawRecord(),links:[{rel:'koppeling',id:'fixture',type:rawRecord().$type}]})).toEqual({id:'fixture',type:rawRecord().$type}));
 it('never treats a column/group koppeling as an individual result',()=>expect(getCanonicalResultIdentity({...rawRecord(),links:[{rel:'koppeling',id:'fixture',type:'resultaten.kolommen.RToetskolom'}]})).toBeNull());
 it('koppeling fallback still rejects multiple possible identities and missing record types',()=>{const links=[{rel:'koppeling',id:'first',type:rawRecord().$type},{rel:'koppeling',id:'second',type:rawRecord().$type}];expect(getCanonicalResultIdentity({...rawRecord(),links})).toBeNull();expect(getCanonicalResultIdentity({...rawRecord(),$type:undefined,links:links.slice(0,1)})).toBeNull();});
 it('scope/dossier/install separation',async()=>{const d=await digest('salt','scope','progression','id');expect(d).toHaveLength(64);expect(d).not.toBe(await digest('salt','scope','exam','id'));expect(d).not.toBe(await digest('other','scope','progression','id'));});
});
describe('narrow resource and projection',()=>{
 it.each(['/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture','/rest/v1/geldendexamendossierresultaten/leerling/fixture','/rest/v1/geldendvoortgangsdossierresultaten/leerling/cijferoverzicht/fixture','/rest/v1/geldendexamendossierresultaten/vakresultaten/fixture/vak/fixture/lichting/fixture','/rest/v1/vakkeuzes/plaatsing/fixture/vakgemiddelden'])('allowlists %s',url=>expect(matchResource(url,origin)).not.toBeNull());
 it.each(['/rest/v1/leerlingen/fixture','/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture/extra','https://evil.invalid/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture'])('rejects %s',url=>expect(matchResource(url,origin)).toBeNull());
 it('accepts the real API host only from the SOMtoday frontend',()=>{const url='https://api.somtoday.nl/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture';expect(matchResource(url,origin)).toMatchObject({surface:'recent',scopeInput:'fixture'});expect(matchResource(url,'https://evil.invalid')).toBeNull();expect(matchResource(url.replace('https:','http:'),origin)).toBeNull();expect(matchResource(url.replace('api.somtoday.nl','api.somtoday.nl.evil.invalid'),origin)).toBeNull();expect(matchResource('https://api.somtoday.nl/rest/v1/leerlingen/fixture',origin)).toBeNull();});
 it('projects explicit fields only',()=>{const records=projectResponse({items:[rawRecord({Authorization:'secret',student:{name:'secret'}})]},matchResource('/rest/v1/geldendvoortgangsdossierresultaten/leerling/fixture',origin)!);expect(records).toHaveLength(1);expect(JSON.stringify(records)).not.toContain('secret');});
 it('aggregate remains aggregate',()=>{const records=projectResponse({vakResultaten:[{perioden:[{resultaten:[rawRecord({$type:undefined})],rapportCijfer:rawRecord()}]}]},matchResource('/rest/v1/geldendvoortgangsdossierresultaten/leerling/cijferoverzicht/fixture',origin)!);expect(records.map(r=>r.aggregate)).toEqual([false,true]);});
 it('drops invalid schema',()=>expect(validateObservation({protocol:'po/1',surface:'recent',scope:null,complete:false,records:[{}]})).toBeNull());
 it('bridge drops extra payload properties',()=>{const m=validateObservation({protocol:'po/1',surface:'recent',scope:null,complete:false,records:[{...record(),token:'secret'}],token:'secret'});expect(JSON.stringify(m)).not.toContain('secret');});
});
describe('unique metadata join',()=>{
 const tuple={subject:'wiskunde a',subtitle:'4 okt · Hoofdstuk 3',weight:'2x',value:'8,3'};
 it('case-normalized full tuple',()=>expect(joinCard(tuple,[record()])?.id).toBe('fixture-result-a'));
 it('ambiguous different self IDs',()=>expect(joinCard(tuple,[record(),record({id:'other'})])).toBeNull());
 it('description alone is insufficient',()=>expect(joinCard({...tuple,subject:'Ander vak'},[record()])).toBeNull());
 it('date mismatch',()=>expect(joinCard({...tuple,subtitle:'5 okt · Hoofdstuk 3'},[record()])).toBeNull());
 it('weight mismatch',()=>expect(joinCard({...tuple,weight:'3x'},[record()])).toBeNull());
 it('decimal grades and weights match their equivalent display notation',()=>expect(joinCard({...tuple,value:'8.30',weight:'2,0 ×'},[record()])?.id).toBe('fixture-result-a'));
 it('a missing description does not disable an otherwise unique full metadata match',()=>expect(joinCard({...tuple,subtitle:'04 okt. 2026',weight:'2 keer'},[record({description:''})])?.id).toBe('fixture-result-a'));
 it('a day substring never matches a different day',()=>expect(joinCard({...tuple,subtitle:'14 okt · Hoofdstuk 3'},[record()])).toBeNull());
 it('unclassified text never becomes an individual pack even with a matching tuple',()=>expect(joinCard(tuple,[record({isCijfer:false,isLabel:false})])).toBeNull());
 it.each(['O','V','G','好','🧪','e\u0301'])('matches a Unicode letter grade %s as displayed',value=>{
  const letter=record({value,isCijfer:false,isLabel:true});
  expect(joinCard({...tuple,value},[letter])?.value).toBe(value);
 });
 it('normalizes equivalent Unicode grade text without equating different letters',()=>{
  expect(joinCard({...tuple,value:'Ｇ'},[record({value:'G',isCijfer:false,isLabel:true})])?.value).toBe('G');
  expect(joinCard({...tuple,value:'V'},[record({value:'O',isCijfer:false,isLabel:true})])).toBeNull();
 });
 it('aggregate excluded',()=>expect(joinCard(tuple,[record({aggregate:true})])).toBeNull());
});
