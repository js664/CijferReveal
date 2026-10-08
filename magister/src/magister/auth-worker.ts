import {magisterOrigin,personRequest,parseRecent} from './provider';
import {debug,errorData} from './debug';

// Authorization values stay in worker memory, separated by tab and tenant.
type Session={origin:string;userId:string;authorization:string;verified:boolean};
const sessions=new Map<number,Session>();
const pending=new Map<string,{tabId:number;session:Session}>();
chrome.webRequest.onBeforeSendHeaders.addListener((details):chrome.webRequest.BlockingResponse|undefined=>{
 if(details.tabId<0||details.type!=='xmlhttprequest')return;
 const person=personRequest(details.url);if(!person||!new URL(details.url).pathname.includes('/cijfers/'))return;
 const authorization=details.requestHeaders?.find(h=>h.name.toLowerCase()==='authorization')?.value;
 debug('auth.grade-request-observed',{tab:details.tabId,present:!!authorization});
 if(!authorization||authorization.length>16384){debug('auth.capture-rejected',{reason:!authorization?'authorization-missing':'authorization-too-long'},'warn');return;}
 const previous=sessions.get(details.tabId);
 if(!previous||previous.origin!==person.origin||previous.userId!==person.userId||previous.authorization!==authorization){
  sessions.set(details.tabId,{...person,authorization,verified:false});
  debug('auth.session-captured',{tab:details.tabId,changed:!!previous});
 }
 pending.set(details.requestId,{tabId:details.tabId,session:sessions.get(details.tabId)!});
 return undefined;
},{urls:['https://*.magister.net/api/personen/*'],types:['xmlhttprequest']},['requestHeaders']);
chrome.webRequest.onCompleted.addListener(details=>{
 const request=pending.get(details.requestId);pending.delete(details.requestId);if(!request||sessions.get(request.tabId)!==request.session)return;
 debug('auth.native-grade-completed',{status:details.statusCode,tab:request.tabId});
 if(details.statusCode<200||details.statusCode>=300){if(!request.session.verified)sessions.delete(request.tabId);return;}
 if(!request.session.verified){request.session.verified=true;debug('auth.session-verified',{tab:request.tabId});void chrome.tabs.sendMessage(request.tabId,{protocol:'po/magister-ready'}).catch(reason=>debug('auth.notify-failed',errorData(reason),'warn'));}
},{urls:['https://*.magister.net/api/personen/*'],types:['xmlhttprequest']});
chrome.webRequest.onErrorOccurred.addListener(details=>{const request=pending.get(details.requestId);pending.delete(details.requestId);if(request&&!request.session.verified&&sessions.get(request.tabId)===request.session)sessions.delete(request.tabId);debug('auth.native-request-failed',{tab:details.tabId},'warn');},{urls:['https://*.magister.net/api/personen/*'],types:['xmlhttprequest']});
function clearSession(tabId:number){sessions.delete(tabId);for(const [id,request] of pending)if(request.tabId===tabId)pending.delete(id);}
chrome.tabs.onRemoved.addListener(tabId=>{clearSession(tabId);debug('auth.tab-removed',{tab:tabId});});
chrome.webRequest.onBeforeRequest.addListener((details):chrome.webRequest.BlockingResponse|undefined=>{
 if(details.tabId>=0){clearSession(details.tabId);debug('auth.navigation-cleared',{tab:details.tabId});}
 return undefined;
},{urls:['https://*.magister.net/*'],types:['main_frame']});

chrome.runtime.onMessage.addListener((message,sender,reply)=>{
 if(!['po/magister-recent','po/magister-session-end'].includes(message?.protocol))return;
 const origin=magisterOrigin(sender.url??'');
 if(sender.id!==chrome.runtime.id||sender.frameId!==0||sender.tab?.id===undefined||!origin)return;
 const tabId=sender.tab.id;
 if(message.protocol==='po/magister-session-end'){clearSession(tabId);debug('auth.logout-cleared',{tab:tabId});reply({ok:true});return;}
 const session=sessions.get(tabId);
 if(!session||session.origin!==origin||!session.verified){debug('api.session-unavailable',{tab:tabId,reason:!session?'session-missing':!session.verified?'native-request-unverified':'tenant-mismatch'},'warn');reply({ok:false,error:'Open Cijfers in Magister of laad de pagina opnieuw om verbinding te maken.'});return;}
 void (async()=>{
  const started=performance.now();debug('api.recent-started',{tab:tabId});
  try{
   const response=await fetch(`${origin}/api/personen/${session.userId}/cijfers/laatste?top=25&skip=0`,{headers:{Authorization:session.authorization},credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(15000)});
   debug('api.recent-http',{status:response.status,durationMs:Math.round(performance.now()-started)});
   if(!response.ok){if(response.status===401||response.status===403)clearSession(tabId);throw new Error();}
   const records=parseRecent(await response.json());
   if(sessions.get(tabId)!==session){debug('api.stale-session',{},'warn');throw new Error();}
   debug('api.recent-completed',{count:records.length,durationMs:Math.round(performance.now()-started)});
   reply({ok:true,userId:session.userId,records});
  }catch(reason){debug('api.recent-failed',{...errorData(reason),durationMs:Math.round(performance.now()-started)},'error');reply({ok:false,error:'Cijfers ophalen is niet gelukt. Laad Magister opnieuw en probeer het nogmaals.'});}
 })();return true;
});
