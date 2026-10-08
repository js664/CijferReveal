let notice:HTMLElement|null=null;
let lastPath='';
let checking=false;
let cijfersCheckWaiting=false;

function clear(){notice?.remove();notice=null;}
function canCheck(){return location.hostname==='leerling.somtoday.nl'&&(location.pathname==='/'||/^\/cijfers\/?$/i.test(location.pathname));}
function eligible(){return location.hostname==='leerling.somtoday.nl'&&/^\/cijfers\/?$/i.test(location.pathname);}

async function check(){
 if(!canCheck())return;
 if(checking){if(eligible())cijfersCheckWaiting=true;return;}
 checking=true;
 let receivedRelease=false;
 try{
  const result=await chrome.runtime.sendMessage({protocol:'po/check-update'});
  receivedRelease=!!result?.version&&typeof result.url==='string';
  if(!eligible()||!result?.update||!result.version||typeof result.url!=='string')return;
  const releaseUrl=new URL(result.url);
  if(releaseUrl.protocol!=='https:'||releaseUrl.hostname!=='github.com'||!/^\/js664\/CijferReveal\/releases\/tag\/v?\d+\.\d+\.\d+$/.test(releaseUrl.pathname))return;
  clear();
  const el=document.createElement('aside');el.className='po-update-notice';el.setAttribute('role','status');el.setAttribute('aria-label','Extensie-update beschikbaar');
  const copy=document.createElement('div');copy.className='po-update-copy';
  const brand=document.createElement('span');brand.className='po-update-brand';brand.textContent='CijferReveal-extensie';
  const title=document.createElement('strong');title.textContent='Update beschikbaar';
  const detail=document.createElement('span');detail.textContent=`Versie ${result.version} staat klaar.`;
  copy.append(brand,title,detail);
  const link=document.createElement('a');link.href=releaseUrl.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Update bekijken';
  const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Melding sluiten');close.textContent='×';close.addEventListener('click',clear,{once:true});
  el.append(copy,link,close);(document.body??document.documentElement).append(el);notice=el;
 }catch{/* Offline or GitHub unavailable: keep the page quiet. */}
 finally{checking=false;if(cijfersCheckWaiting){cijfersCheckWaiting=false;if(eligible()&&!receivedRelease)void check();}}
}

export function syncUpdateNotice(){
 const path=location.pathname;
 if(path===lastPath)return;
 lastPath=path;
 if(!eligible())clear();
 if(!canCheck()){clear();return;}
 void check();
}

export function disposeUpdateNotice(){clear();lastPath='';}
