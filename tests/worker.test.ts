import {it,expect,vi,beforeEach,afterEach} from 'vitest';
import {newState,type State} from '../src/state/schema';
import {classify,markOpened,cancelOpened} from '../src/state/classifier';
import {LIVE_PROFILE} from '../src/somtoday/validation-profile';
import {record,key,scope,version} from './fixtures';
const id='a'.repeat(32),popup={id,url:`chrome-extension://${id}/popup.html`},content={id,url:'https://leerling.somtoday.nl/cijfers',frameId:0,tab:{id:1} as chrome.tabs.Tab};
type Reply={ok:boolean;state?:State;error?:string};
type Listener=(message:unknown,sender:chrome.runtime.MessageSender,reply:(response:Reply)=>void)=>true|undefined;
beforeEach(()=>vi.resetModules());afterEach(()=>vi.unstubAllGlobals());
async function harness(initial:unknown){
 let stored=structuredClone(initial),listener!:Listener;
 const get=vi.fn(async()=>({poState:structuredClone(stored)})),set=vi.fn(async(data:{poState:State})=>{stored=structuredClone(data.poState);});
 vi.stubGlobal('chrome',{runtime:{id,onMessage:{addListener:(fn:Listener)=>{listener=fn;}}},storage:{local:{get,set}}});
 await import('../src/state/worker');
 const send=(command:unknown,sender:chrome.runtime.MessageSender=popup)=>new Promise<Reply|null>(resolve=>{if(listener({protocol:'po/storage',command},sender,resolve)!==true)resolve(null);});
 return {send,get,set};
}
it('the worker preserves observed identities on reset and rejects an opening started before that reset',async()=>{
 const state=newState();classify(state,{record:record(),key,scope,version},LIVE_PROFILE);markOpened(state,key,version,scope);
 const worker=await harness(state),reset=await worker.send({kind:'reset'});
 expect(reset?.ok).toBe(true);expect(reset?.state).toMatchObject({salt:state.salt,resetGeneration:1,collection:[],records:{[key]:{state:'pending'}}});
 expect((await worker.send({kind:'open',key,scope,version,generation:0},content))?.ok).toBe(false);
 expect((await worker.send({kind:'read'}))?.state?.collection).toEqual([]);
 expect((await worker.send({kind:'open',key,scope,version,generation:1},content))?.state?.collection).toHaveLength(1);
});
it('cancelling a first opening restores it to pending and removes its collection entry',()=>{
 const state=newState();classify(state,{record:record(),key,scope,version},LIVE_PROFILE);markOpened(state,key,version,scope);
 expect(state.collection).toHaveLength(1);cancelOpened(state,key,version,scope);
 expect(state.records[key]).toMatchObject({state:'pending',version});expect(state.collection).toEqual([]);
 expect(()=>cancelOpened(state,key,version,scope)).toThrow();
});
it('reset can recover malformed storage and subsequent new grades are detected normally',async()=>{
 const worker=await harness({schema:99});expect((await worker.send({kind:'read'}))?.ok).toBe(false);
 const reset=await worker.send({kind:'reset'});expect(reset?.state?.schema).toBe(2);
 const observed=await worker.send({kind:'observe',scope,surface:'recent',inputs:[{record:record({value:'6,75'}),key,scope,version}]},content);
 expect(observed?.state?.records[key]).toMatchObject({state:'pending',display:{value:'6,75',grade:6.75}});
});
it('unauthorized reset and malformed observations never read or write storage',async()=>{
 const worker=await harness(newState());
 expect(await worker.send({kind:'reset'},content)).toBeNull();
 expect(await worker.send({kind:'observe',scope,surface:'recent',inputs:[{record:record(),key:'__proto__',scope,version}]},content)).toBeNull();
 expect(worker.get).not.toHaveBeenCalled();expect(worker.set).not.toHaveBeenCalled();
});
