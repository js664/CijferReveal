import {it,expect} from 'vitest';
import {newState,type State} from '../shared/state/schema';
import {migrate} from '../shared/state/migrations';
import {observeLogicalResults} from '../shared/state/logical-results';
import {classify,queue,markOpened,resetOpenedResults} from '../shared/state/classifier';
import {digest} from '../src/somtoday/identity';
import {joinCard} from '../src/somtoday/dom-join';
import {LIVE_PROFILE} from '../shared/results/validation-profile';
import {record} from './fixtures';
import type {ResultRecord} from '../shared/results/types';
const scope='a'.repeat(64),tuple={subject:'Nederlands',subtitle:'1 okt • Debugtoets',weight:'4x',value:'6,3'};
const a=record({id:'po-debug-progression',selfType:'resultaten.DebugResultaat',type:'resultaten.DebugResultaat',family:'progression',subject:'Nederlands',subjectId:'po-debug-subject',description:'Debugtoets',date:'2026-10-01T00:00:00',weight:'4x',value:'6,3',period:'DEBUG',testCode:'PO-DEBUG',columnType:'Toetskolom'});
const b={...a,id:'po-debug-exam',family:'exam' as const};
async function input(state:State,r:ResultRecord,account=scope){return {record:r,scope:account,key:await digest(state.salt,account,r.family,r.id,r.variant??''),version:await digest(state.salt,'raw-version',JSON.stringify(r))};}
async function inject(state:State,records:ResultRecord[],account=scope){const inputs=await Promise.all(records.map(r=>input(state,r,account)));await observeLogicalResults(state,inputs);return inputs;}
function match(state:State,inputs:Awaited<ReturnType<typeof inject>>){return joinCard(tuple,inputs.map(i=>i.record),r=>state.aliases[inputs.find(i=>i.record===r)!.key].logicalKey);}
const proven=[{...a,columnId:'shared-result-column'},{...b,columnId:'shared-result-column'}];

it('UNCHANGED userscript: matching visible text and testCode without shared identity stays ambiguous',async()=>{
 const state=newState(),inputs=await inject(state,[a,b]);
 expect(Object.keys(state.records)).toHaveLength(2);expect(queue(state,scope)).toHaveLength(2);expect(match(state,inputs)).toBeNull();expect(state.collection).toHaveLength(0);
});
it('PROVEN aliases: one logical grade, one pending pack, one inventory entry, no replay after reload',async()=>{
 let state=newState();const inputs=await inject(state,proven);
 expect(Object.keys(state.records)).toHaveLength(1);expect(queue(state,scope)).toHaveLength(1);expect(match(state,inputs)).not.toBeNull();
 const grade=queue(state,scope)[0];markOpened(state,grade.key,grade.version,scope);
 expect(queue(state,scope)).toHaveLength(0);expect(state.collection).toHaveLength(1);
 expect(new Set(Object.values(state.aliases).map(a=>a.logicalKey)).size).toBe(1);expect(Object.values(state.aliases).every(a=>a.openedSignature===a.signature)).toBe(true);
 state=migrate(JSON.parse(JSON.stringify(state)));await inject(state,[...proven].reverse());
 expect(Object.keys(state.records)).toHaveLength(1);expect(queue(state,scope)).toHaveLength(0);expect(state.collection).toHaveLength(1);
});
it('an alias arriving after the other was opened cannot create a phantom pending pack',async()=>{
 for(const records of [proven,[...proven].reverse()]){
  const s=newState();await inject(s,[records[0]]);const first=queue(s,scope)[0];markOpened(s,first.key,first.version,scope);await inject(s,[records[1]]);
  expect(queue(s,scope)).toHaveLength(0);expect(s.collection).toHaveLength(1);expect(Object.keys(s.records)).toHaveLength(1);
 }
});
it.each(['columnId','subjectId','cohortId','testCode','period','description','date','value','weight'] as const)('different %s never collapses two raw results',async field=>{
 const s=newState(),different={...proven[1],[field]:field==='value'?'7,3':field==='weight'?'5x':field==='date'?'2026-10-02T00:00:00':'different'};
 await inject(s,[proven[0],different]);expect(Object.keys(s.records)).toHaveLength(2);expect(new Set(Object.values(s.aliases).map(a=>a.logicalKey)).size).toBe(2);
});
it('same-looking independent tests with different columns remain a DOM ambiguity',async()=>{
 const s=newState(),inputs=await inject(s,[proven[0],{...proven[1],columnId:'other-column'}]);expect(match(s,inputs)).toBeNull();
});
it('multiple raw IDs within the same dossier cannot masquerade as a cross-dossier alias pair',async()=>{
 const s=newState(),inputs=await inject(s,[proven[0],{...proven[0],id:'different-progress-record'}]);expect(Object.keys(s.records)).toHaveLength(2);expect(match(s,inputs)).toBeNull();
});
it('account scopes never share logical keys or opened state',async()=>{
 const s=newState();await inject(s,proven);const first=queue(s,scope)[0];markOpened(s,first.key,first.version,scope);
 await inject(s,proven,'b'.repeat(64));expect(queue(s,'b'.repeat(64))).toHaveLength(1);expect(queue(s,scope)).toHaveLength(0);expect(s.collection).toHaveLength(1);
});
it('reset removes opened markers across every alias and permits exactly one replay',async()=>{
 const s=newState();await inject(s,proven);const first=queue(s,scope)[0];markOpened(s,first.key,first.version,scope);resetOpenedResults(s);await inject(s,proven);
 expect(queue(s,scope)).toHaveLength(1);expect(s.collection).toEqual([]);const next=queue(s,scope)[0];markOpened(s,next.key,next.version,scope);expect(s.collection).toHaveLength(1);
});
it('legacy raw opened entries migrate only after exact raw identity/version re-observation proves aliasing',async()=>{
 const s=newState(),inputs=await Promise.all(proven.map(r=>input(s,r)));
 for(const i of inputs){classify(s,i,LIVE_PROFILE);markOpened(s,i.key,i.version,scope);}
 expect(s.collection).toHaveLength(2);const loaded=migrate(JSON.parse(JSON.stringify(s)));await observeLogicalResults(loaded,inputs);
 expect(Object.keys(loaded.records)).toHaveLength(1);expect(loaded.collection).toHaveLength(1);expect(queue(loaded,scope)).toHaveLength(0);
});
it('old schemas without alias metadata migrate without guessing links from display text',()=>{
 const legacy:Partial<State>=newState();delete legacy.aliases;expect(migrate(legacy).aliases).toEqual({});
});
it('corrupt alias display values cannot be restored as a different grade',async()=>{
 const s=newState();await inject(s,proven);Object.values(s.aliases)[0].display!.grade=9.9;expect(()=>migrate(s)).toThrow();
});
it('a revised result opens once after aliases converge; its previous archived version survives',async()=>{
 const s=newState();await inject(s,proven);const old=queue(s,scope)[0];markOpened(s,old.key,old.version,scope);
 await inject(s,[{...proven[0],value:'7,3'}]);expect(Object.keys(s.records)).toHaveLength(2);
 await inject(s,[{...proven[1],value:'7,3'}]);expect(queue(s,scope)).toHaveLength(1);expect(s.collection.map(c=>c.value)).toEqual(['6,3']);
 const next=queue(s,scope)[0];expect(next.key).toBe(old.key);expect(next.version).not.toBe(old.version);markOpened(s,next.key,next.version,scope);expect(s.collection.map(c=>c.value)).toEqual(['6,3','7,3']);
});
