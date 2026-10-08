import {debug,errorData} from '../magister/debug';
import {useCallback,useEffect,useRef,useState} from 'react';
import {AnimatePresence,LayoutGroup,motion} from 'motion/react';
import type {DisplayResult} from '../somtoday/types';
import type {Settings} from '../state/schema';
import {MysteryReel} from './MysteryReel';
import {ResultReveal} from './ResultReveal';
import {OpeningCard} from './OpeningCard';
import {OpeningAudio} from './audio';
import {REDUCED_STOP_MS} from './choreography';
import {createSpinPlan,type SpinPlan} from './ReelEngine';
export interface OpeningProps {result:DisplayResult;settings:Settings;audio:OpeningAudio;commit:(r:DisplayResult)=>Promise<void>;cancel?:(r:DisplayResult)=>Promise<void>;replay?:boolean;close:()=>void;next?:()=>void;position:number;total:number;spinPlan?:SpinPlan;}
type Phase='preview'|'starting'|'mystery'|'stopped'|'result'|'error';
export function OpeningOverlay({result,settings,audio,commit,cancel=async()=>{},replay=false,close,next,position,total,spinPlan}:OpeningProps){
 const reduced=settings.motion==='reduce'||matchMedia('(prefers-reduced-motion: reduce)').matches;
 const [clock,setClock]=useState<(()=>number)|null>(null),[phase,setPhase]=useState<Phase>('preview');
 const [plan]=useState(()=>spinPlan??createSpinPlan(Math.random,undefined,result.value));
 const landed=useCallback(()=>{if(alive.current)setPhase('stopped');},[]);
 const ref=useRef<HTMLDivElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null),alive=useRef(true),starting=useRef(false),committed=useRef(false),cancelRequested=useRef(false),rolledBack=useRef(false);
 const stopped=useCallback(()=>{if(!alive.current)return;audio.reveal(result.grade,settings);setPhase('result');},[audio,result.grade,settings]);
 const start=useCallback(async()=>{
  if(starting.current)return;starting.current=true;setPhase('starting');
  // Start the AudioContext from the user's click/key gesture, before async storage.
  const unlocked=audio.unlock();
  try{
   // Opening authorizes the visible grade cards. Persist before mounting the real target.
   if(!replay){await commit(result);committed.current=true;}await unlocked;if(!alive.current){if(cancelRequested.current&&committed.current&&!replay&&!rolledBack.current){rolledBack.current=true;await cancel(result).catch(()=>{});}return;}
   const audioClock=await audio.start(settings,reduced?undefined:plan);if(!alive.current){audio.stop();return;}
   setPhase('mystery');
   const beginning=performance.now();let pausedAt:number|null=document.hidden?beginning:null,pausedDuration=0;
   const visualClock=()=>Math.max(0,(pausedAt??performance.now())-beginning-pausedDuration);
   const visibility=()=>{
    if(document.hidden){pausedAt??=performance.now();audio.pause();}
    else if(pausedAt!==null){pausedDuration+=performance.now()-pausedAt;pausedAt=null;audio.resume();}
   };
   visibilityHandler.current=visibility;document.addEventListener('visibilitychange',visibility);
   if(document.hidden)audio.pause();
   if(reduced)timer.current=setTimeout(stopped,REDUCED_STOP_MS);else setClock(()=>audioClock??visualClock);
  }catch(reason){debug('opening.failed',errorData(reason),'error');if(alive.current){starting.current=false;setPhase('error');}}
 },[audio,commit,cancel,replay,result,settings,reduced,stopped,plan]);
 const visibilityHandler=useRef<(()=>void)|null>(null);
 const cancelOpening=useCallback(async()=>{cancelRequested.current=true;audio.stop();if(timer.current)clearTimeout(timer.current);if(committed.current&&!replay&&!rolledBack.current){rolledBack.current=true;await cancel(result).catch(()=>{});}close();},[audio,cancel,close,replay,result]);
 useEffect(()=>{alive.current=true;ref.current?.focus();return()=>{alive.current=false;if(timer.current)clearTimeout(timer.current);if(visibilityHandler.current)document.removeEventListener('visibilitychange',visibilityHandler.current);audio.stop();};},[audio]);
 useEffect(()=>{debug('opening.phase',{stage:phase,replay,position,total,reduced,sound:settings.sound});if(phase==='result'||phase==='error')ref.current?.focus();},[phase,replay,position,total,reduced,settings.sound]);
 const onKey=(e:React.KeyboardEvent)=>{
  if(e.key==='Enter'&&!e.repeat){
   if(phase==='preview'){e.preventDefault();void start();}
   else if(phase==='result'&&!(e.target instanceof HTMLButtonElement)){e.preventDefault();(next??close)();}
  }
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(['starting','mystery','stopped'].includes(phase))void cancelOpening();else if(['preview','error','result'].includes(phase))close();}
  if(e.key==='Tab'){
   const buttons=[...ref.current?.querySelectorAll<HTMLButtonElement>('button')??[]].filter(button=>!button.disabled);
   if(!buttons.length){e.preventDefault();return;}
   const first=buttons[0],last=buttons[buttons.length-1],active=(ref.current?.getRootNode() as Document|ShadowRoot).activeElement;
   if(e.shiftKey&&(active===first||active===ref.current)){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&(active===last||active===ref.current)){e.preventDefault();first.focus();}
  }
 };
 const preview=phase==='preview'||phase==='starting';
 return <motion.div className={`po-opening-overlay po-phase-${phase}`} role="dialog" aria-modal="true" aria-label="Cijfer openen" tabIndex={-1} ref={ref} onKeyDown={onKey} initial={{opacity:0,backdropFilter:'blur(0px)'}} animate={{opacity:1,backdropFilter:'blur(12px)'}} transition={{duration:reduced?.12:.28}}>
  <header className="po-opening-header"><div className="po-opening-brand"><span>Pack Opening voor Magister</span></div><span className="po-opening-count">CIJFER {String(position).padStart(2,'0')} <span aria-hidden="true">/</span> {String(total).padStart(2,'0')}</span></header>
  <main className="po-opening-main"><LayoutGroup id="po-opening"><AnimatePresence mode="sync" initial={false}>
   {preview?<OpeningCard key="preview" result={result} reduced={reduced} preview>
    <div className="po-preview-action"><button className="po-primary po-open-card" disabled={phase==='starting'} onClick={()=>void start()}><span>{phase==='starting'?'Openen…':'Open Cijfer'}</span><span className="po-open-card-end" aria-hidden="true"><kbd>Enter</kbd><svg viewBox="0 0 24 24"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></button></div>
   </OpeningCard>:phase==='result'?<ResultReveal key="result" result={result} reduced={reduced}/>:phase==='error'?<motion.div key="error" className="po-error" initial={{opacity:0}} animate={{opacity:1}}><h2>Openen is niet gelukt</h2><p>Je cijfer blijft verborgen. Probeer het opnieuw.</p><button className="po-secondary" onClick={()=>void start()}>Opnieuw proberen</button></motion.div>:<motion.section key="opening-stage" className={`po-opening-stage${phase==='stopped'?' po-opening-stopped':''}`} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?.12:.42}}>
    <div className="po-spin-context"><h1>{result.subject}</h1><p>{result.description}</p></div>
    {!reduced&&clock?<MysteryReel clock={clock} stopped={stopped} landed={landed} result={result.value} plan={plan}/>:<motion.div className="po-short-mystery" layoutId={reduced?undefined:'po-sealed-folio'} aria-hidden="true">{result.value}</motion.div>}
   </motion.section>}
  </AnimatePresence></LayoutGroup>
  <div className="po-announcement" role="status" aria-live="polite" aria-atomic="true">{phase==='result'?`${result.subject}. Cijfer ${result.value}.`:''}</div></main>
  <footer className="po-opening-footer">{phase==='result'?<><p>{position} VAN {total} GEOPEND</p><div className="po-actions">{next&&<button className="po-primary" onClick={next}>Volgende openen</button>}<button className="po-secondary" onClick={close}>Terug naar SOMtoday</button></div></>:phase==='error'?<button className="po-secondary" onClick={close}>Terug naar SOMtoday</button>:null}</footer>
 </motion.div>;
}
