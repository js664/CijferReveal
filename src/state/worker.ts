import {migrate} from './migrations';
import {newState} from './schema';
import {noteCoverage,markOpened,cancelOpened,resetOpenedResults} from './classifier';
import {observeLogicalResults} from './logical-results';
import {LIVE_PROFILE} from '../somtoday/validation-profile';
import {authorizeCommand} from './commands';
import {releaseUpdate} from '../shared/release-update';

const RELEASE_API='https://api.github.com/repos/js664/CijferReveal/releases/latest';
let updateCheckedAt=0;
let updateResponse:{update:boolean;version:string|null;url:string|null}|null=null;

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.protocol!=='po/check-update')return;
 const page=sender.url;
 if(!page?.startsWith('https://leerling.somtoday.nl/cijfers')||/^https:\/\/leerling\.somtoday\.nl\/cijfers\/vakgemiddelden(?:\/|\?|$)/i.test(page))return;
 const respond=async()=>{
  if(Date.now()-updateCheckedAt<60*60*1000&&updateResponse){reply(updateResponse);return;}
  try{
   const response=await fetch(RELEASE_API,{headers:{Accept:'application/vnd.github+json'}});
   if(!response.ok)throw new Error('release lookup failed');
   const current=chrome.runtime.getManifest().version;
   const parsed=releaseUpdate(current,await response.json());if(!parsed)throw new Error('invalid release metadata');
   updateResponse=parsed;
   updateCheckedAt=Date.now();reply(updateResponse);
  }catch{reply({update:false,version:null,url:null});}
 };
 void respond();return true;
});

let transaction=Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 const c=authorizeCommand(message,sender,chrome.runtime.id);if(!c)return;
 transaction=transaction.then(async()=>{try{
  const stored=await chrome.storage.local.get('poState');
  // The reset button also recovers corrupt local storage. Normal resets keep
  // known result identities so open tabs can immediately offer those packs.
  let state;try{state=migrate(stored.poState);}catch(error){if(c.kind!=='reset')throw error;state=newState();}
  switch(c.kind){
   case 'read':break;
   case 'observe':
    await observeLogicalResults(state,c.inputs);
    if(c.scope)noteCoverage(state,c.scope,c.surface,LIVE_PROFILE);break;
   case 'open':markOpened(state,c.key,c.version,c.scope,undefined,c.generation);break;
   case 'cancel-open':cancelOpened(state,c.key,c.version,c.scope,c.generation);break;
   case 'settings':state.settings=c.settings;break;
   case 'clear-collection':state.collection=[];break;
   case 'reset':resetOpenedResults(state);break;
  }
  await chrome.storage.local.set({poState:state});reply({ok:true,state});
 }catch{reply({ok:false,error:'Lokale gegevens kunnen niet veilig worden verwerkt.'});}});
 return true;
});
