let notice:HTMLElement|null=null;
let lastPath='';
let checking=false;

function clear(){notice?.remove();notice=null;}
function eligible(){return location.hostname==='leerling.somtoday.nl'&&/^\/cijfers(?:\/|$)/i.test(location.pathname)&&!/^\/cijfers\/(?:vakgemiddelden|vakresultaten)(?:\/|$)/i.test(location.pathname);}

async function check(){
 if(!eligible()||checking)return;
 checking=true;
 try{
  const result=await chrome.runtime.sendMessage({protocol:'po/check-update'});
  if(!eligible()||!result?.update||!result.version||typeof result.url!=='string')return;
  const releaseUrl=new URL(result.url);
  if(releaseUrl.protocol!=='https:'||releaseUrl.hostname!=='github.com'||!/^\/js664\/CijferReveal\/releases\/tag\/v?\d+\.\d+\.\d+$/.test(releaseUrl.pathname))return;
  clear();
  const el=document.createElement('aside');el.className='po-update-notice';el.setAttribute('role','status');el.setAttribute('aria-label','Extensie-update beschikbaar');
  const copy=document.createElement('div');copy.className='po-update-copy';
  const title=document.createElement('strong');title.textContent='Update beschikbaar';
  const detail=document.createElement('span');detail.textContent=`Versie ${result.version} staat klaar.`;
  copy.append(title,detail);
  const link=document.createElement('a');link.href=releaseUrl.href;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Update bekijken';
  const close=document.createElement('button');close.type='button';close.setAttribute('aria-label','Melding sluiten');close.textContent='×';close.addEventListener('click',clear,{once:true});
  el.append(copy,link,close);(document.body??document.documentElement).append(el);notice=el;
 }catch{/* Offline or GitHub unavailable: keep the page quiet. */}
 finally{checking=false;}
}

export function syncUpdateNotice(){
 const path=location.pathname;
 if(path===lastPath)return;
 lastPath=path;
 if(!eligible()){clear();return;}
 void check();
}

export function disposeUpdateNotice(){clear();lastPath='';}
