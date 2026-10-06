import {it,expect} from 'vitest';
import {authorizeCommand} from '../src/state/commands';
import {record,key,scope,version} from './fixtures';
const id='a'.repeat(32),popup={id,url:`chrome-extension://${id}/popup.html`},content={id,url:'https://leerling.somtoday.nl/cijfers',frameId:0,tab:{id:1} as chrome.tabs.Tab};
const message=(command:unknown)=>({protocol:'po/storage',command});
const observation={kind:'observe',scope,surface:'recent',inputs:[{record:record(),key,scope,version}]};
it('only the extension popup can reset, clear history or change settings',()=>{
 for(const command of [{kind:'reset'},{kind:'clear-collection'},{kind:'settings',settings:{sound:true,volume:.7,motion:'system'}}]){
  expect(authorizeCommand(message(command),popup,id)).toEqual(command);expect(authorizeCommand(message(command),content,id)).toBeNull();
 }
});
it('only a top-level SOMtoday content script can observe and open results',()=>{
 const open={kind:'open',key,scope,version,generation:0};
 expect(authorizeCommand(message(open),content,id)).toEqual(open);expect(authorizeCommand(message(observation),content,id)).toEqual(observation);
 for(const sender of [popup,{...content,frameId:1},{...content,url:'https://leerling.somtoday.nl.evil.invalid/cijfers'},{...content,id:'other'},{...content,url:'http://leerling.somtoday.nl/cijfers'}]){
  expect(authorizeCommand(message(open),sender,id)).toBeNull();expect(authorizeCommand(message(observation),sender,id)).toBeNull();
 }
});
it('only a top-level SOMtoday content script can cancel a just-started opening',()=>{
 const cancel={kind:'cancel-open',key,scope,version,generation:0};
 expect(authorizeCommand(message(cancel),content,id)).toEqual(cancel);
 expect(authorizeCommand(message(cancel),popup,id)).toBeNull();
 expect(authorizeCommand(message({...cancel,generation:-1}),content,id)).toBeNull();
});
it('storage reads reject other extension pages and unexpected senders',()=>{
 expect(authorizeCommand(message({kind:'read'}),popup,id)).toEqual({kind:'read'});
 for(const sender of [{...popup,url:`chrome-extension://${id}/tester.html`},{...popup,url:`chrome-extension://other/popup.html`},{url:popup.url},{...content,tab:undefined}])expect(authorizeCommand(message({kind:'read'}),sender,id)).toBeNull();
});
it('malformed commands, mismatched scopes, oversized batches and invalid settings are rejected',()=>{
 for(const command of [null,[],{kind:'unknown'},{kind:'open',key:'__proto__',scope,version,generation:0},{kind:'open',key,scope,version,generation:-1},{...observation,surface:'arbitrary'},{...observation,scope:'f'.repeat(64)},{...observation,inputs:Array(2001).fill(observation.inputs[0])},{...observation,inputs:[{...observation.inputs[0],record:{}}]}])expect(authorizeCommand(message(command),content,id)).toBeNull();
 for(const settings of [{sound:'true',volume:.7,motion:'system'},{sound:true,volume:Infinity,motion:'system'},{sound:true,volume:2,motion:'system'},{sound:true,volume:.7,motion:'other'}])expect(authorizeCommand(message({kind:'settings',settings}),popup,id)).toBeNull();
});
it('observation payloads discard extra properties before entering storage',()=>{
 const command=authorizeCommand(message({...observation,extra:'private',inputs:[{...observation.inputs[0],extra:'private',record:{...record(),extra:'private'}}]}),content,id);
 expect(command).toEqual(observation);expect(JSON.stringify(command)).not.toContain('private');
});
