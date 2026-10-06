import {afterEach,expect,it} from 'vitest';
import {projectResponse} from '../src/somtoday/projection';
import {readCardTuple} from '../src/somtoday/dom-card';
import {joinCard} from '../src/somtoday/dom-join';
import {validateObservation} from '../src/somtoday/schemas';
import {digest} from '../src/somtoday/identity';
import {observeLogicalResults} from '../src/state/logical-results';
import {markOpened,queue} from '../src/state/classifier';
import {migrate} from '../src/state/migrations';
import {newState,type State} from '../src/state/schema';
import {nativeCard,rawRecord} from './fixtures';
import type {Resource} from '../src/somtoday/resources';
const resource={surface:'recent',family:'progression'} as Resource;
const raw=()=>rawRecord({formattedResultaat:'8,3',formattedEerstePoging:'8,3',formattedEerstePogingAlternatief:'6,3',additionalObjects:{vaknaam:'Wiskunde A',vakuuid:'fixture-subject',resultaatkolom:{id:'shared-column',type:'Toetskolom'},naamalternatiefniveau:'HAVO'}});
afterEach(()=>document.body.replaceChildren());
function card(value:string,label?:string){
 document.body.innerHTML=nativeCard(value);const owner=document.querySelector<HTMLElement>('sl-laatste-resultaat-item')!;
 const title=owner.querySelector('.titel')!,container=document.createElement('div');container.className='titel-container';title.before(container);container.append(title);
 if(label){const postfix=document.createElement('span');postfix.className='titel-postfix';postfix.textContent='\u00a0'+label;container.append(postfix);}
 return owner;
}
it.each(['HAVO','VWO','Onbekend niveau','Ω 🧪'])('projects the actual alternative result and matches the production sibling label %s',label=>{
 const records=projectResponse({items:[raw()]},resource);
 expect(records.map(r=>[r.variant,r.value])).toEqual([[undefined,'8,3'],['alternative-first','6,3']]);
 expect(validateObservation({protocol:'po/1',surface:'recent',scope:'a'.repeat(64),complete:false,records})).not.toBeNull();
 expect(joinCard(readCardTuple(card('6,3',label)),records)?.variant).toBe('alternative-first');
 expect(joinCard(readCardTuple(card('8,3')),records)?.variant).toBeUndefined();
 // A postfix never makes the standard value an alternative result.
 expect(joinCard(readCardTuple(card('8,3',label)),records)).toBeNull();
});
it('keeps alternative retakes separate and uses the real shared attempt dates',()=>{
 const records=projectResponse({items:[rawRecord({...raw(),formattedHerkansing1:'9,0',formattedHerkansing1Alternatief:'7,0',datumInvoerHerkansing1:'2026-10-05T09:00:00',formattedHerkansing2Alternatief:'G',datumInvoerHerkansing2:'2026-10-06T09:00:00'})]},resource);
 expect(records.find(r=>r.variant==='alternative-attempt-1')).toMatchObject({value:'7,0',date:'2026-10-05T09:00:00'});
 expect(records.find(r=>r.variant==='alternative-attempt-2')).toMatchObject({value:'G',date:'2026-10-06T09:00:00'});
 expect(new Set(records.map(r=>r.variant)).size).toBe(records.length);
});
it('does not infer an alternative result from a label or a current overall value',()=>{
 expect(projectResponse({items:[rawRecord({formattedResultaatAlternatief:'6,3'})]},resource).some(r=>r.variant?.startsWith('alternative-'))).toBe(false);
 expect(joinCard(readCardTuple(card('*','HAVO')),projectResponse({items:[rawRecord()]},resource))).toBeNull();
});
it('fails closed for two distinct alternative assignments and for indistinguishable unlabeled normings',()=>{
 const input=raw(),other={...input,links:[{rel:'self',id:'another-result',type:input.$type}],additionalObjects:{...input.additionalObjects,resultaatkolom:{id:'another-column',type:'Toetskolom'}}};
 expect(joinCard(readCardTuple(card('6,3','HAVO')),projectResponse({items:[input,other]},resource))).toBeNull();
 const same=projectResponse({items:[{...input,formattedEerstePogingAlternatief:'8,3'}]},resource);
 expect(joinCard(readCardTuple(card('8,3')),same)).toBeNull();
 expect(joinCard(readCardTuple(card('8,3','HAVO')),same)?.variant).toBe('alternative-first');
});
it('preserves existing standard opened state and persists the alternative independently without duplicate inventory',async()=>{
 const scope='b'.repeat(64),records=projectResponse({items:[raw()]},resource);
 async function inject(state:State,selected=records){
  const inputs=await Promise.all(selected.map(async record=>({record,scope,key:record.variant?await digest(state.salt,scope,record.family,record.id,record.variant):await digest(state.salt,scope,record.family,record.id),version:await digest(state.salt,'version',JSON.stringify(record))})));
  await observeLogicalResults(state,inputs);return inputs;
 }
 let state=newState();await inject(state,[records[0]]);const standard=queue(state,scope)[0];markOpened(state,standard.key,standard.version,scope);
 await inject(state);expect(queue(state,scope)).toHaveLength(1);expect(queue(state,scope)[0].display?.value).toBe('6,3');
 const alternative=queue(state,scope)[0];expect(alternative.key).not.toBe(standard.key);markOpened(state,alternative.key,alternative.version,scope);
 state=migrate(JSON.parse(JSON.stringify(state)));await inject(state);expect(queue(state,scope)).toHaveLength(0);expect(state.collection).toHaveLength(2);expect(Object.keys(state.records)).toHaveLength(2);
});
