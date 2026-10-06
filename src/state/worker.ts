import {migrate} from './migrations';
import {newState} from './schema';
import {noteCoverage,markOpened,cancelOpened,resetOpenedResults} from './classifier';
import {observeLogicalResults} from './logical-results';
import {LIVE_PROFILE} from '../somtoday/validation-profile';
import {authorizeCommand} from './commands';
import {releaseUpdate} from '../shared/release-update';

const RELEASE_API='https://api.github.com/repos/js664/CijferReveal/releases/latest';
const UPDATE_CACHE_KEY='poUpdateCheckCache';
const UPDATE_CACHE_TTL=60*60*1000;
let updateCheckedAt=0;
let updateResponse:{update:boolean;version:string|null;url:string|null}|null=null;
let updateLookup:Promise<{update:boolean;version:string|null;url:string|null}>|null=null;

async function latestUpdate(){
 if(updateResponse&&Date.now()-updateCheckedAt<UPDATE_CACHE_TTL)return updateResponse;
 if(updateLookup)return updateLookup;
 updateLookup=(async()=>{
  try{
   let cache:{checkedAt?:unknown;version?:unknown;url?:unknown}|undefined;
   try{cache=(await chrome.storage.local.get(UPDATE_CACHE_KEY))[UPDATE_CACHE_KEY] as typeof cache;}catch{/* Continue with the API request if local cache is unavailable. */}
   if(typeof cache?.checkedAt==='number'&&cache.checkedAt>0&&cache.checkedAt<=Date.now()&&Date.now()-cache.checkedAt<UPDATE_CACHE_TTL&&typeof cache.version==='string'&&typeof cache.url==='string'){
    const validated=releaseUpdate(chrome.runtime.getManifest().version,{tag_name:`v${cache.version}`,html_url:cache.url,draft:false,prerelease:false});
    if(validated){updateCheckedAt=cache.checkedAt;updateResponse=validated;return updateResponse;}
   }
   const response=await fetch(RELEASE_API,{headers:{Accept:'application/vnd.github+json'},credentials:'omit',referrerPolicy:'no-referrer'});
   if(!response.ok)throw new Error('release lookup failed');
   const parsed=releaseUpdate(chrome.runtime.getManifest().version,await response.json());if(!parsed)throw new Error('invalid release metadata');
   updateCheckedAt=Date.now();updateResponse=parsed;
   try{await chrome.storage.local.set({[UPDATE_CACHE_KEY]:{checkedAt:updateCheckedAt,version:parsed.version,url:parsed.url}});}catch{/* The in-memory cache still serves this page session. */}
   return parsed;
  }catch{return{update:false,version:null,url:null};}
 })();
 try{return await updateLookup;}finally{updateLookup=null;}
}

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.protocol!=='po/check-update')return;
 const page=sender.url;
 let route:URL;try{route=new URL(page??'');}catch{return;}
 if(route.hostname!=='leerling.somtoday.nl'||(route.pathname!=='/'&&!/^\/cijfers\/?$/i.test(route.pathname)))return;
 void latestUpdate().then(reply);return true;
});

let transaction=Promise.resolve();
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 const c=authorizeCommand(message,sender,chrome.runtime.id,chrome.runtime.getURL('popup.html'));if(!c)return;
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
