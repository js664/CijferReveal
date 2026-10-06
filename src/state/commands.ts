import type {Command} from './repository';
import type {ClassifiedInput} from './classifier';
import {validRecord,validateObservation} from '../somtoday/schemas';

const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const hash=(v:unknown):v is string=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export function authorizeCommand(message:unknown,sender:chrome.runtime.MessageSender,id:string,popupUrl=`chrome-extension://${id}/popup.html`):Command|null{
 if(sender.id!==id||!object(message)||message.protocol!=='po/storage'||!object(message.command))return null;
 let url:URL;try{url=new URL(sender.url??'');}catch{return null;}
 // Firefox's extension URL uses a browser-assigned UUID, not runtime.id.
 // Trust only the popup URL supplied by our runtime, never a sender's host.
 let expected:URL;try{expected=new URL(popupUrl);}catch{return null;}
 const popup=['chrome-extension:','moz-extension:'].includes(expected.protocol)&&url.protocol===expected.protocol&&url.hostname===expected.hostname&&url.port===expected.port&&!url.username&&!url.password&&url.pathname==='/popup.html'&&expected.pathname==='/popup.html';
 const content=url.origin==='https://leerling.somtoday.nl'&&!url.username&&!url.password&&!!sender.tab&&sender.frameId===0;
 if(!popup&&!content)return null;
 const c=message.command;
 switch(c.kind){
  case 'read':return {kind:'read'};
  case 'reset':case 'clear-collection':return popup?{kind:c.kind}:null;
  case 'settings':{
   const s=c.settings;if(!popup||!object(s)||typeof s.sound!=='boolean'||typeof s.volume!=='number'||!Number.isFinite(s.volume)||s.volume<0||s.volume>1||(s.motion!=='system'&&s.motion!=='reduce'))return null;
   return {kind:'settings',settings:{sound:s.sound,volume:s.volume,motion:s.motion}};
  }
  case 'open':case 'cancel-open':{
   if(!content||!hash(c.key)||!hash(c.version)||!hash(c.scope)||typeof c.generation!=='number'||!Number.isSafeInteger(c.generation)||c.generation<0)return null;
   return {kind:c.kind,key:c.key,scope:c.scope,version:c.version,generation:c.generation};
  }
  case 'observe':{
   if(!content||!Array.isArray(c.inputs)||c.inputs.length>2000||(c.scope!==null&&!hash(c.scope)))return null;
   const inputs:ClassifiedInput[]=[];
   for(const input of c.inputs){
    if(!object(input)||!hash(input.key)||!hash(input.scope)||!hash(input.version)||!validRecord(input.record)||(c.scope!==null&&input.scope!==c.scope))return null;
    inputs.push({key:input.key,scope:input.scope,version:input.version,record:input.record});
   }
   const observation=validateObservation({protocol:'po/1',surface:c.surface,scope:c.scope,complete:false,records:inputs.map(input=>input.record)});
   if(!observation)return null;
   return {kind:'observe',scope:observation.scope,surface:observation.surface,inputs:inputs.map((input,index)=>({...input,record:observation.records[index]}))};
  }
  default:return null;
 }
}
