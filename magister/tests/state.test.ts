import {it,expect} from 'vitest';
import {newState} from '../src/state/schema';
import {migrate} from '../src/state/migrations';
import {classify,noteCoverage,queue,markOpened,collection,resetOpenedResults} from '../src/state/classifier';
import {LIVE_PROFILE} from '../src/somtoday/validation-profile';
import {record,fixtureProfile,key,scope,version} from './fixtures';
const input=(value='8,3',v=version,k=key)=>({record:record({value}),key:k,scope,version:v});
it('a uniquely matched numeric result on first install is an openable pack',()=>{const s=newState();classify(s,input(),fixtureProfile);expect(s.records[key].state).toBe('pending');expect(s.records[key].display?.value).toBe('8,3');expect(queue(s,scope)).toHaveLength(1);expect(s.collection).toEqual([]);});
it('recent feed does not establish coverage',()=>{const s=newState();noteCoverage(s,scope,'recent',fixtureProfile);expect(s.coverage[scope].armed).toBe(false);});
it('overview alone does not arm',()=>{const s=newState();noteCoverage(s,scope,'overview',fixtureProfile);expect(s.coverage[scope].armed).toBe(false);});
it('coverage only arms after explicit validated policy and sources',()=>{const s=newState();noteCoverage(s,scope,'overview',fixtureProfile);noteCoverage(s,scope,'subject',fixtureProfile);expect(s.coverage[scope].armed).toBe(true);});
it('first-install numeric packs do not depend on historical baseline arming',()=>{const s=newState();noteCoverage(s,scope,'overview',LIVE_PROFILE);noteCoverage(s,scope,'subject',LIVE_PROFILE);classify(s,input(),LIVE_PROFILE);expect(s.coverage[scope].armed).toBe(false);expect(s.records[key].state).toBe('pending');expect(queue(s,scope)).toHaveLength(1);});
it('star is a pending pack even without live numeric arming',()=>{const s=newState();classify(s,input('*'),LIVE_PROFILE);expect(s.records[key].state).toBe('pending');expect(s.records[key].display).toMatchObject({value:'*',grade:null});expect(queue(s,scope)).toHaveLength(1);});
it('legacy observed stars upgrade without resetting opened stars',()=>{const s=newState();s.records[key]={key,scope,version,state:'observed-nonnumeric',numeric:false,firstSeen:1};classify(s,input('*'),LIVE_PROFILE);expect(s.records[key].state).toBe('pending');markOpened(s,key,version,scope);const loaded=migrate(JSON.parse(JSON.stringify(s)));classify(loaded,input('*'),LIVE_PROFILE);expect(loaded.records[key].state).toBe('opened');expect(queue(loaded,scope)).toHaveLength(0);expect(loaded.collection[0]).toMatchObject({value:'*',grade:null});});
it('opened star becoming a numeric grade gets its own pack after arming',()=>{const s=newState();classify(s,input('*'),LIVE_PROFILE);markOpened(s,key,version,scope);s.coverage[scope]={overview:true,subject:true,armed:true};classify(s,input('8,3','d'.repeat(64)),fixtureProfile);expect(s.records[key].state).toBe('pending');markOpened(s,key,'d'.repeat(64),scope);expect(s.collection.map(c=>c.value)).toEqual(['*','8,3']);});
it('unclassified values and aggregate grades stay ineligible',()=>{for(const patch of [{isCijfer:false,isLabel:false},{aggregate:true}]){const s=newState();classify(s,{...input('G'),record:record({value:'G',isCijfer:false,isLabel:true,...patch})},LIVE_PROFILE);expect(queue(s,scope)).toHaveLength(0);}});
it.each(['O','V','G','好','🧪','e\u0301'])('letter and Unicode grades %s can be opened and survive reload',value=>{
 const s=newState(),letter={...input(value),record:record({value,isCijfer:false,isLabel:true})};
 classify(s,letter,LIVE_PROFILE);expect(queue(s,scope)[0].display).toMatchObject({value,grade:null});
 markOpened(s,key,version,scope,100);expect(s.collection[0]).toMatchObject({value,grade:null});
 expect(migrate(JSON.parse(JSON.stringify(s))).collection[0]).toMatchObject({value,grade:null});
});
it('known star to newly numeric is pending after arming',()=>{const s=newState();classify(s,input('*'),fixtureProfile);noteCoverage(s,scope,'overview',fixtureProfile);noteCoverage(s,scope,'subject',fixtureProfile);classify(s,input('8,3','d'.repeat(64)),fixtureProfile);expect(s.records[key].state).toBe('pending');});
it('star to numeric remains openable without a historical baseline or live profile',()=>{for(const profile of [fixtureProfile,LIVE_PROFILE]){const s=newState();classify(s,input('*'),profile);classify(s,input('8,3','d'.repeat(64)),profile);expect(s.records[key].state).toBe('pending');expect(s.records[key].display?.value).toBe('8,3');}});
it('sequential queue and opened persistence',()=>{const s=newState();s.coverage[scope]={overview:true,subject:true,armed:true};classify(s,input(),fixtureProfile,1);classify(s,input('7,8','d'.repeat(64),'e'.repeat(64)),fixtureProfile,2);expect(queue(s,scope)).toHaveLength(2);markOpened(s,key,version,scope,3);expect(queue(s,scope)).toHaveLength(1);const loaded=migrate(JSON.parse(JSON.stringify(s)));classify(loaded,input(),fixtureProfile);expect(loaded.records[key].state).toBe('opened');expect(collection(loaded,scope)).toHaveLength(1);});
it('changed numeric versions offer a new pack while preserving the previous opened result',()=>{const s=newState();classify(s,input(),LIVE_PROFILE);markOpened(s,key,version,scope);classify(s,input('9,7','d'.repeat(64)),LIVE_PROFILE);expect(s.records[key].state).toBe('pending');expect(s.records[key].display?.value).toBe('9,7');expect(s.collection[0].value).toBe('8,3');markOpened(s,key,'d'.repeat(64),scope);expect(s.collection.map(c=>c.value)).toEqual(['8,3','9,7']);});
it('stale open transaction rejected',()=>{const s=newState();s.coverage[scope]={overview:true,subject:true,armed:true};classify(s,input(),fixtureProfile);expect(()=>markOpened(s,key,'d'.repeat(64),scope)).toThrow();expect(s.records[key].state).toBe('pending');});
it('collection only opened and newest first',()=>{const s=newState();s.coverage[scope]={overview:true,subject:true,armed:true};classify(s,input(),fixtureProfile);classify(s,input('7,8','d'.repeat(64),'e'.repeat(64)),fixtureProfile);markOpened(s,key,version,scope,100);markOpened(s,'e'.repeat(64),'d'.repeat(64),scope,200);expect(collection(s,scope).map(c=>c.value)).toEqual(['7,8','8,3']);expect(collection(s,'f'.repeat(64))).toEqual([]);});
it('v1 migrates to v2',()=>expect(migrate({...newState(),schema:1}).schema).toBe(2));
it('unknown future storage never silently resets',()=>expect(()=>migrate({...newState(),schema:99})).toThrow());
it('malformed persisted identity fails closed',()=>expect(()=>migrate({...newState(),records:{bad:{key:'raw-id'}}})).toThrow());

it('a published numeric value replaces an unresolved legacy record without requiring validation flags',()=>{const s=newState();classify(s,input('*'),LIVE_PROFILE);s.records[key].state='unresolved';classify(s,input('8,3','d'.repeat(64)),LIVE_PROFILE);expect(s.records[key].state).toBe('pending');});
it('legacy baseline results become openable, while already opened results remain opened',()=>{const s=newState();classify(s,input(),LIVE_PROFILE);s.records[key].state='baseline';classify(s,input(),LIVE_PROFILE);expect(s.records[key].state).toBe('pending');markOpened(s,key,version,scope);classify(s,input(),LIVE_PROFILE);expect(s.records[key].state).toBe('opened');});
it('newly detected numeric records join the queue after installation without coverage arming',()=>{const s=newState();classify(s,input(),LIVE_PROFILE,1);markOpened(s,key,version,scope,2);classify(s,input('6,75','d'.repeat(64),'e'.repeat(64)),LIVE_PROFILE,3);expect(queue(s,scope).map(r=>r.display?.value)).toEqual(['6,75']);expect(s.collection.map(c=>c.value)).toEqual(['8,3']);});
it('archive survives numeric revisions and migration',()=>{const s=newState();s.coverage[scope]={overview:true,subject:true,armed:true};classify(s,input(),fixtureProfile);markOpened(s,key,version,scope);classify(s,input('9,7','d'.repeat(64)),fixtureProfile);expect(migrate(JSON.parse(JSON.stringify(s))).collection[0].value).toBe('8,3');});
it('reset clears history and makes known numeric and star results openable immediately without changing identities',()=>{
 const s=newState(),salt=s.salt;classify(s,input(),LIVE_PROFILE);markOpened(s,key,version,scope);
 const star=input('*','d'.repeat(64),'e'.repeat(64));classify(s,star,LIVE_PROFILE);markOpened(s,star.key,star.version,scope);
 s.settings={sound:false,volume:0,motion:'reduce'};resetOpenedResults(s);
 expect(s.salt).toBe(salt);expect(s.resetGeneration).toBe(1);expect(s.collection).toEqual([]);expect(queue(s,scope)).toHaveLength(2);
 classify(s,input(),LIVE_PROFILE);classify(s,star,LIVE_PROFILE);
 expect(queue(migrate(JSON.parse(JSON.stringify(s))),scope)).toHaveLength(2);expect(s.settings).toMatchObject({sound:true,volume:.7,motion:'system'});
});
it('reset cancels stale openings, preserves textual grade cards, and still accepts newly published grades',()=>{
 const s=newState();classify(s,input(),LIVE_PROFILE);const generation=s.resetGeneration;
 classify(s,{...input('voldoende','d'.repeat(64),'e'.repeat(64)),record:record({value:'voldoende',isLabel:true})},LIVE_PROFILE);
 resetOpenedResults(s);expect(()=>markOpened(s,key,version,scope,10,generation)).toThrow();expect(s.collection).toEqual([]);
 expect(s.records['e'.repeat(64)].state).toBe('pending');
 markOpened(s,key,version,scope,11,s.resetGeneration);
 classify(s,input('7,25','f'.repeat(64),'d'.repeat(64)),LIVE_PROFILE);
 expect(queue(s,scope).map(r=>r.display?.value).sort()).toEqual(['7,25','voldoende'].sort());
});
it('existing installations migrate a missing reset generation to zero',()=>{
 const legacy:Partial<ReturnType<typeof newState>>=newState();delete legacy.resetGeneration;expect(migrate(legacy).resetGeneration).toBe(0);
});
it('reset removes the opened lock from legacy records without a display snapshot',()=>{
 const s=newState();classify(s,input(),LIVE_PROFILE);markOpened(s,key,version,scope);delete s.records[key].display;
 resetOpenedResults(s);expect(s.records[key].state).toBe('unresolved');classify(s,input(),LIVE_PROFILE);expect(queue(s,scope)).toHaveLength(1);
});
