import {motion} from 'motion/react';
import {BorderBeam} from 'border-beam';
import type {ReactNode,CSSProperties} from 'react';
import {useLayoutEffect} from 'react';
import type {DisplayResult} from '../somtoday/types';
import {TiltCard} from './TiltCard';
import {BEAM_SHADOW_CSS,registerBeamProperties} from './beam';
import {Particles} from './particles';
import {tierFor} from './tiers';
import {parseSomtodayDate} from '../somtoday/date-parser';

/** Shared material, light, beam and pointer glare for the preview and result. */
export function OpeningCard({result,reduced,preview=false,children}:{result:DisplayResult;reduced:boolean;preview?:boolean;children:ReactNode}){
 const tier=tierFor(preview?null:result.grade);
 const date=parseSomtodayDate(result.date);
 useLayoutEffect(()=>{registerBeamProperties();},[]);
 return <motion.div className={`po-result po-tier-${tier.name}${preview?' po-preview':''}`} style={{'--po-tier':tier.color} as CSSProperties}
  initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduced?.12:.3}}>
  {!reduced&&<Particles grade={preview?null:result.grade}/>}
  <div className="po-result-light" aria-hidden="true"/>
  <TiltCard reduced={reduced}>
   <motion.div layoutId={reduced?undefined:preview?'po-sealed-folio':'po-opening-folio'} className="po-result-folio"
    transition={{layout:{duration:.5,ease:[.22,1,.36,1]}}}>
    <div className="po-folio-beam" aria-hidden="true"><BorderBeam css={BEAM_SHADOW_CSS} size="md" colorVariant="mono" strength={.32} active={!reduced} theme="dark" borderRadius={12} style={{width:'100%',height:'100%'}}><div/></BorderBeam></div>
    <div className="po-result-content">
     {preview?<div className="po-preview-body"><div className="po-preview-details"><h2 className="po-subject">{result.subject}</h2><p className="po-description">{result.description}</p>{Number.isFinite(date.getTime())&&<time className="po-preview-date" dateTime={result.date}>{new Intl.DateTimeFormat('nl-NL',{day:'numeric',month:'long'}).format(date)}</time>}</div><span className="po-preview-grade" aria-hidden="true">?</span></div>:<><h2 className="po-subject">{result.subject}</h2><p className="po-description">{result.description}</p></>}
     {children}
    </div>
    <div className="po-result-folio-glare" aria-hidden="true"/>
   </motion.div>
  </TiltCard>
 </motion.div>;
}
