const chooser=document.querySelector('.download-chooser');
const trigger=chooser?.querySelector('.download-trigger');
const options=chooser?.querySelector('.download-options');
if(chooser&&trigger&&options){
 const setOpen=(open,restoreFocus=false)=>{
  chooser.classList.toggle('is-open',open);trigger.setAttribute('aria-expanded',String(open));options.inert=!open;
  if(open)options.querySelector('a')?.focus({preventScroll:true});else if(restoreFocus)trigger.focus({preventScroll:true});
 };
 trigger.addEventListener('click',()=>setOpen(!chooser.classList.contains('is-open')));
 document.addEventListener('pointerdown',event=>{if(!chooser.contains(event.target))setOpen(false,options.contains(document.activeElement));});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&chooser.classList.contains('is-open')){event.preventDefault();setOpen(false,true);}});
 chooser.addEventListener('focusout',event=>{
  if(event.relatedTarget instanceof Node){if(!chooser.contains(event.relatedTarget))setOpen(false);}
  else setTimeout(()=>{if(!chooser.contains(document.activeElement))setOpen(false);},0);
 });
}

const warning=document.querySelector('#magister-warning');
const magisterLink=document.querySelector('.provider-option[href*="CijferReveal-Magister.zip"]');
if(warning&&magisterLink){
 const closeWarning=()=>{warning.classList.remove('is-visible');warning.close();trigger?.focus({preventScroll:true});};
 magisterLink.addEventListener('click',event=>{event.preventDefault();chooser.classList.remove('is-open');trigger.setAttribute('aria-expanded','false');options.inert=true;warning.showModal();requestAnimationFrame(()=>warning.classList.add('is-visible'));warning.querySelector('.warning-cancel').focus();});
 warning.querySelector('.warning-cancel').addEventListener('click',closeWarning);
 warning.addEventListener('cancel',event=>{event.preventDefault();closeWarning();});
}
