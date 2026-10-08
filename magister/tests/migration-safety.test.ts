import {it,expect} from 'vitest';
import {newState,defaultSettings} from '../src/state/schema';
import {migrate} from '../src/state/migrations';
import {classify,markOpened} from '../src/state/classifier';
import {record,key,scope,version} from './fixtures';
import {LIVE_PROFILE} from '../src/somtoday/validation-profile';

function opened(){
 const state=newState();
 classify(state,{record:record(),key,scope,version},LIVE_PROFILE,1);
 markOpened(state,key,version,scope,2);
 return state;
}
it('repairs invalid settings individually while preserving valid choices',()=>{
 const state=opened();
 expect(migrate({...state,settings:{sound:false,volume:NaN,motion:'reduce'}}).settings).toEqual({sound:false,volume:defaultSettings.volume,motion:'reduce'});
 expect(migrate({...state,settings:{sound:'false',volume:0,motion:'unsupported'}}).settings).toEqual({...defaultSettings,volume:0});
});
it('rejects corrupted record and alias display snapshots consistently',()=>{
 const state=opened(),display=state.records[key].display!;
 const alias={scope,family:'progression',rawVersion:version,signature:'d'.repeat(64),logicalKey:key,numeric:true,firstSeen:1,display};
 for(const patch of [{value:''},{grade:Infinity},{description:42},{key:'wrong'}]){
  expect(()=>migrate({...state,records:{[key]:{...state.records[key],display:{...display,...patch}}}})).toThrow();
  expect(()=>migrate({...state,aliases:{[key]:{...alias,display:{...display,...patch}}}})).toThrow();
 }
});
it('drops corrupt inventory entries without discarding usable opened results',()=>{
 const state=opened(),entry=state.collection[0];
 const loaded=migrate({...state,collection:[entry,{...entry,value:''},{...entry,grade:Infinity},{...entry,scope:'bad'},{...entry,openedAt:NaN}]});
 expect(loaded.collection).toEqual([entry]);
 expect(loaded.records[key].state).toBe('opened');
});
it('rejects malformed record metadata without silently resetting users',()=>{
 const state=opened();
 for(const patch of [{scope:'raw-id'},{numeric:'yes'},{state:'unknown'},{firstSeen:Infinity},{lastResolvedState:'unknown'}]){
  expect(()=>migrate({...state,records:{[key]:{...state.records[key],...patch}}})).toThrow();
 }
});
