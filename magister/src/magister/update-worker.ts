import {magisterOrigin} from './provider';
import {magisterRelease,type MagisterUpdate} from './release-update';
import {debug,errorData} from './debug';
const key='poMagisterUpdateCache',ttl=60*60*1000;
let cached:MagisterUpdate|null=null,checkedAt=0,pending:Promise<MagisterUpdate|null>|null=null;
export async function latestMagisterUpdate():Promise<MagisterUpdate|null>{
 if(cached&&Date.now()-checkedAt<ttl)return cached;if(pending)return pending;
 pending=(async()=>{try{
  const stored=(await chrome.storage.local.get(key))[key] as {checkedAt?:unknown;release?:unknown}|undefined;
  const version=chrome.runtime.getManifest().version;
  if(typeof stored?.checkedAt==='number'&&stored.checkedAt<=Date.now()&&Date.now()-stored.checkedAt<ttl){const valid=magisterRelease(version,stored.release);if(valid){cached=valid;checkedAt=stored.checkedAt;return valid;}}
  const response=await fetch('https://api.github.com/repos/js664/CijferReveal/releases/latest',{headers:{Accept:'application/vnd.github+json'},credentials:'omit',referrerPolicy:'no-referrer',redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('release lookup failed');const valid=magisterRelease(version,await response.json());if(!valid)return null;
  cached=valid;checkedAt=Date.now();const tag=`v${valid.version}`;
  await chrome.storage.local.set({[key]:{checkedAt,release:{tag_name:tag,html_url:valid.url,draft:false,prerelease:valid.prerelease,assets:[{name:'CijferReveal-Magister.zip',browser_download_url:`https://github.com/js664/CijferReveal/releases/download/${tag}/CijferReveal-Magister.zip`}]}}});
  debug('update.checked',{version:valid.version,present:valid.update});return valid;
 }catch(reason){debug('update.check-failed',errorData(reason),'warn');return cached;}})();
 try{return await pending;}finally{pending=null;}
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(message?.protocol!=='po/check-magister-update'||sender.id!==chrome.runtime.id||sender.frameId!==0||!sender.tab||!magisterOrigin(sender.url??''))return;
 void latestMagisterUpdate().then(reply);return true;
});
