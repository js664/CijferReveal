import {registerStorageWorker} from '../../shared/state/worker';
import {authorizeCommand} from '../../shared/state/commands';
import {releaseUpdate} from '../../shared/release-update';

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

registerStorageWorker(authorizeCommand);
