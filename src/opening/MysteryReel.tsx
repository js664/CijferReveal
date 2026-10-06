import {useLayoutEffect,useRef,useState} from 'react';
import {motion} from 'motion/react';
import {BorderBeam} from 'border-beam';
import {registerBeamProperties,BEAM_SHADOW_CSS} from './beam';
import {ReelEngine} from './ReelEngine';
import {TARGET_INDEX,TICK_SECONDS} from './choreography';

const ITEM_COUNT=TARGET_INDEX+10;
const INITIAL_INDEX=TARGET_INDEX-TICK_SECONDS.length;
// The surrounding cards are visual possibilities only. The target card below
// always uses `result`, so the reel never chooses or changes the real grade.
const GRADES=Array.from({length:80},(_,index)=>`${2+Math.floor(index/10)},${index%10}`);

export function MysteryReel({clock,stopped,result}:{clock:()=>number;stopped:()=>void;result:string}){
 const [visible,setVisible]=useState(()=>new Set<number>()),containerRef=useRef<HTMLDivElement>(null),stripRef=useRef<HTMLDivElement>(null);
 useLayoutEffect(()=>{
  registerBeamProperties();const container=containerRef.current,strip=stripRef.current;if(!container||!strip)return;
  let cardWidth=0,laneWidth=0,current=0,lastCenter=-1;
  let gap=20;
  const paint=()=>{if(!cardWidth)return;const pitch=cardWidth+gap,center=Math.round(INITIAL_INDEX+current);strip.style.transform=`translate3d(${laneWidth/2-(INITIAL_INDEX+current)*pitch-cardWidth/2}px,0,0)`;if(center!==lastCenter){strip.querySelector('.po-reel-item.is-center')?.classList.remove('is-center');strip.children[center]?.classList.add('is-center');lastCenter=center;}};
  const measure=()=>{const card=strip.firstElementChild as HTMLElement|null;if(!card)return;cardWidth=parseFloat(getComputedStyle(card).width);gap=parseFloat(getComputedStyle(strip).columnGap)||0;laneWidth=container.clientWidth;paint();};
  const observer=new IntersectionObserver(entries=>setVisible(previous=>{const next=new Set(previous);for(const entry of entries){const index=Number((entry.target as HTMLElement).dataset.index);if(entry.isIntersecting)next.add(index);else next.delete(index);}return next;}),{root:container,rootMargin:'180px'});
  strip.querySelectorAll('.po-reel-item').forEach(item=>observer.observe(item));
  const engine=new ReelEngine(progress=>{current=progress;paint();},stopped);
  const resize=new ResizeObserver(measure);resize.observe(container);measure();engine.start(clock);
  return()=>{engine.cancel();resize.disconnect();observer.disconnect();};
 },[clock,stopped]);
 return <div className="po-lane" ref={containerRef} aria-label="Cijferrol" aria-hidden="true"><div className="po-marker"/><div className="po-track" ref={stripRef}>{Array.from({length:ITEM_COUNT},(_,index)=>{
  const target=index===TARGET_INDEX,grade=target?result:GRADES[(index*7+Math.floor(index/3))%GRADES.length];
  return <div className="po-reel-item" data-index={index} key={index}><BorderBeam className="po-mystery-beam" css={BEAM_SHADOW_CSS} size="md" colorVariant="mono" strength={.18} active={visible.has(index)} theme="dark" borderRadius={16} style={{width:'100%',height:'100%'}}><motion.div layoutId={target?'po-opening-folio':index===INITIAL_INDEX?'po-sealed-folio':undefined} transition={{layout:{duration:.5,ease:[.22,1,.36,1]}}} className="po-mystery-card" data-target-folio={target?'true':undefined}><span className="po-mystery-grade">{grade}</span><span className="po-mystery-glint" aria-hidden="true"/></motion.div></BorderBeam></div>;
 })}</div></div>;
}
