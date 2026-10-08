import {motion} from 'motion/react';
import type {DisplayResult} from '../results/types';
import {OpeningCard} from './OpeningCard';

export function ResultReveal({result,reduced}:{result:DisplayResult;reduced:boolean}){
 return <OpeningCard result={result} reduced={reduced}>
  <motion.div className="po-grade" role="img" aria-label={`Cijfer ${result.value}`}
   initial={{scale:reduced?1:.98}} animate={{scale:1}} transition={{duration:reduced?.12:.3,ease:[.16,1,.36,1]}}>{result.value}</motion.div>
  <p className="po-result-weight">Weging <span>{result.weight}×</span></p>
 </OpeningCard>;
}
