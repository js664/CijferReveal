import {it,expect,vi,afterEach} from 'vitest';
import {Bridge} from '../shared/content/bridge';
import {command} from '../shared/state/repository';
import {newState} from '../shared/state/schema';
import {classify,markOpened,collection,queue} from '../shared/state/classifier';
import {LIVE_PROFILE} from '../shared/results/validation-profile';
import {record} from './fixtures';
vi.mock('../shared/state/repository',()=>({command:vi.fn()}));
afterEach(()=>vi.clearAllMocks());
it('switching accounts isolates the live queue and archive, even when result IDs match',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const failed=vi.fn(),bridge=new Bridge(()=>{},failed);await bridge.start();
 const send=(scope:string,value:string)=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface:'recent',scope,complete:false,records:[record({value})]}}));
 try{
  const a='a'.repeat(64),b='b'.repeat(64);send(a,'8,3');await vi.waitFor(()=>expect(queue(state,a)).toHaveLength(1));
  const first=queue(state,a)[0];markOpened(state,first.key,first.version,a);
  send(b,'6,75');await vi.waitFor(()=>expect(queue(state,b)).toHaveLength(1));
  expect(bridge.records.size).toBe(1);expect(bridge.activeScope).toBe(b);expect([...bridge.records.values()][0].scope).toBe(b);
  expect(collection(state,a).map(r=>r.value)).toEqual(['8,3']);expect(collection(state,b)).toEqual([]);
  expect(queue(state,b)[0].key).not.toBe(first.key);expect(failed).not.toHaveBeenCalled();
 }finally{bridge.dispose();}
});
it('a late unscoped response cannot overwrite the canonical numeric result',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const changed=vi.fn(),bridge=new Bridge(changed,()=>{});await bridge.start();
 const send=(scope:string|null,value:string)=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface:scope?'recent':'overview',scope,complete:false,records:[record({value})]}}));
 try{
  const scope='a'.repeat(64);send(scope,'6,75');await vi.waitFor(()=>expect(queue(state,scope)).toHaveLength(1));
  const changes=changed.mock.calls.length;send(null,'8,3');await vi.waitFor(()=>expect(changed.mock.calls.length).toBeGreaterThan(changes));
  expect([...bridge.records.values()][0].record.value).toBe('6,75');expect(queue(state,scope)[0].display?.value).toBe('6,75');
 }finally{bridge.dispose();}
});
it('storage refresh and newly arriving grades are serialized so neither update is lost',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const bridge=new Bridge(()=>{},()=>{});await bridge.start();
 let finishRead!:(state:ReturnType<typeof newState>)=>void;
 vi.mocked(command).mockImplementationOnce(()=>new Promise(resolve=>{finishRead=resolve;}));
 try{
  const refresh=bridge.refresh();await vi.waitFor(()=>expect(finishRead).toBeDefined());
  window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface:'recent',scope:'a'.repeat(64),complete:false,records:[record({value:'7,25'})]}}));
  await Promise.resolve();expect(bridge.records.size).toBe(0);
  finishRead(state);await refresh;await vi.waitFor(()=>expect(bridge.records.size).toBe(1));
  expect(queue(bridge.state!,'a'.repeat(64))[0].display?.value).toBe('7,25');
 }finally{bridge.dispose();}
});
it('empty scoped responses still switch accounts and clear the old live cards',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const changed=vi.fn(),bridge=new Bridge(changed,()=>{});await bridge.start();
 const send=(scope:string,records:ReturnType<typeof record>[])=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface:'recent',scope,complete:false,records}}));
 try{
  send('a'.repeat(64),[record()]);await vi.waitFor(()=>expect(bridge.records.size).toBe(1));const changes=changed.mock.calls.length;
  send('b'.repeat(64),[]);await vi.waitFor(()=>expect(bridge.activeScope).toBe('b'.repeat(64)));
  expect(bridge.records.size).toBe(0);expect(changed.mock.calls.length).toBeGreaterThan(changes);
 }finally{bridge.dispose();}
});
it('an older scoped overview cannot roll back a newly published direct result',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const changed=vi.fn(),bridge=new Bridge(changed,()=>{});await bridge.start();
 const send=(surface:string,value:string)=>window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface,scope:'a'.repeat(64),complete:false,records:[record({value})]}}));
 try{
  send('recent','7,2');await vi.waitFor(()=>expect(bridge.records.size).toBe(1));const changes=changed.mock.calls.length;
  send('overview','*');await vi.waitFor(()=>expect(changed.mock.calls.length).toBeGreaterThan(changes));
  expect(queue(state,'a'.repeat(64))[0].display?.value).toBe('7,2');
 }finally{bridge.dispose();}
});
it('different attempts of the same test keep separate identities and queue entries',async()=>{
 const state=newState();vi.mocked(command).mockImplementation(async c=>{if(c.kind==='observe')for(const input of c.inputs)classify(state,input,LIVE_PROFILE);return state;});
 const bridge=new Bridge(()=>{},()=>{});await bridge.start();
 try{
  window.dispatchEvent(new MessageEvent('message',{source:window,origin:location.origin,data:{protocol:'po/1',surface:'recent',scope:'a'.repeat(64),complete:false,records:[record({value:'4,0'}),record({value:'8,0',variant:'attempt-1'})]}}));
  await vi.waitFor(()=>expect(bridge.records.size).toBe(2));expect(new Set([...bridge.records.values()].map(r=>r.key)).size).toBe(2);expect(queue(state,'a'.repeat(64)).map(r=>r.display?.value).sort()).toEqual(['4,0','8,0']);
 }finally{bridge.dispose();}
});
