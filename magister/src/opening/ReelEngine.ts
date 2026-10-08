export type LandingMode='soft'|'edge'|'near-miss';
import {familyReelValues,resultFamilyFor} from './result-families';
// Original recording: steady main spin, then a locally scheduled ending.
export const ORIGINAL_SPIN_MS=3500;
const ORIGINAL_SPEED=.00808;
const ORIGINAL_POSITION=ORIGINAL_SPEED*(ORIGINAL_SPIN_MS-447-160/2);
export interface SpinPlan {
 readonly startMs:number;readonly accelerationMs:number;readonly brakeMs:number;
 readonly stopMs:number;readonly revealMs:number;readonly power:number;
 readonly approachMs:number;readonly landingMode:LandingMode;
 readonly initialIndex:number;readonly targetIndex:number;readonly landingOffset:number;
 readonly distance:number;readonly speed:number;readonly ticks:readonly number[];
 readonly tickDirections:readonly number[];readonly tickSounds:readonly {sample:string;gain:number;rate:number}[];
 readonly grades:readonly string[];
 readonly resultFamily:string|null;
}
const brakeArea=(power:number)=>1-2/(power+1)+1/(2*power+1);
const brakeIntegral=(u:number,power:number)=>u-2*u**(power+1)/(power+1)+u**(2*power+1)/(2*power+1);

/** One immutable plan owns the destination, motion, and audio crossing times. */
export function createSpinPlan(random:()=>number=Math.random,mode?:LandingMode,result=''):SpinPlan {
 const initialIndex=4,targetIndex=initialIndex+30+Math.floor(random()*5);
 const choice=random(),landingMode=mode??(choice<.5?'soft':choice<.78?'edge':'near-miss');
 const landingOffset=landingMode==='soft'?-.16-random()*.14:landingMode==='edge'?.20+random()*.17:.54+random()*.06;
 const startMs=447,accelerationMs=160,brakeMs=ORIGINAL_SPIN_MS,power=1.5+random()*1.2;
 const distance=targetIndex-initialIndex,travel=distance+landingOffset;
 const speed=ORIGINAL_SPEED,approachMs=brakeMs+(travel-ORIGINAL_POSITION)/(speed*brakeArea(power));
 const stopMs=approachMs+320+random()*100+(landingMode==='near-miss'?120:0);
 const base={startMs,accelerationMs,brakeMs,approachMs,stopMs,revealMs:stopMs+140,power,initialIndex,targetIndex,landingOffset,landingMode,distance,speed};
 const ticks:number[]=[],tickDirections:number[]=[];
 for(let boundary=.5;boundary<travel;boundary++){
  let low=startMs,high=approachMs;
  for(let i=0;i<48;i++){const middle=(low+high)/2;if(reelProgress(middle,base)<boundary)low=middle;else high=middle;}
  ticks.push((low+high)/2);tickDirections.push(1);
 }
 // A genuine near miss crosses the next boundary in both directions. Its
 // softer return click is scheduled from that same trajectory, not faked.
 if(landingMode==='near-miss'){
  let low=approachMs,high=stopMs;
  for(let i=0;i<48;i++){const middle=(low+high)/2;if(reelProgress(middle,base)>distance+.5)low=middle;else high=middle;}
  ticks.push((low+high)/2);tickDirections.push(-1);
 }
 // Late clicks come from the original MP3 at their native pitch and volume.
 const tickSounds=ticks.map((_,index)=>Object.freeze({sample:'case-opening.mp3',gain:tickDirections[index]<0?.46:1,rate:1}));
 const family=resultFamilyFor(result);
 if(family){const grades=familyReelValues(family,result,targetIndex+10,targetIndex,random);return Object.freeze({...base,ticks:Object.freeze(ticks),tickDirections:Object.freeze(tickDirections),tickSounds:Object.freeze(tickSounds),grades,resultFamily:family.id});}
 // Balanced shuffled bags guarantee the full 2.x–9.x range in every reel.
 const bag=Array.from({length:8},(_,i)=>i+2),grades:string[]=[];
 while(grades.length<targetIndex+10){
  for(let i=bag.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}
  for(const integer of bag)grades.push(`${integer},${Math.floor(random()*10)}`);
 }
 return Object.freeze({...base,ticks:Object.freeze(ticks),tickDirections:Object.freeze(tickDirections),tickSounds:Object.freeze(tickSounds),grades:Object.freeze(grades),resultFamily:null});
}
type Trajectory=Pick<SpinPlan,'startMs'|'accelerationMs'|'brakeMs'|'approachMs'|'stopMs'|'power'|'distance'|'landingOffset'|'speed'>;
const settle=(u:number)=>u*u*u*(10+u*(-15+6*u));
/** Brake continuously, then make one bounded adjustment into the true center. */
export function reelProgress(ms:number,plan:Trajectory):number {
 const {startMs,accelerationMs,brakeMs,approachMs,stopMs,speed,power,distance,landingOffset}=plan;
 if(ms<=startMs)return 0;if(ms>=stopMs)return distance;
 if(ms>=approachMs)return distance+landingOffset*(1-settle((ms-approachMs)/(stopMs-approachMs)));
 const elapsed=ms-startMs;
 if(elapsed<accelerationMs){const u=elapsed/accelerationMs;return speed*accelerationMs*(u*u*u-.5*u*u*u*u);}
 if(ms<brakeMs)return speed*(elapsed-accelerationMs/2);
 const duration=approachMs-brakeMs,u=(ms-brakeMs)/duration;
 return speed*(brakeMs-startMs-accelerationMs/2+duration*brakeIntegral(u,power));
}
export class ReelEngine {
 private frame=0;private cancelled=false;private landed=false;
 constructor(private plan:SpinPlan,private update:(progress:number)=>void,private stop:()=>void,private landing:()=>void=()=>{}){}
 start(clock:()=>number){const tick=()=>{
  if(this.cancelled)return;const elapsed=clock();this.update(reelProgress(elapsed,this.plan));
  if(elapsed>=this.plan.stopMs&&!this.landed){this.landed=true;this.landing();}
  if(elapsed>=this.plan.revealMs){this.stop();return;}this.frame=requestAnimationFrame(tick);
 };this.frame=requestAnimationFrame(tick);}
 cancel(){this.cancelled=true;cancelAnimationFrame(this.frame);}
}
