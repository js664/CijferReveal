import {debug,errorData} from '../diagnostics';
import type {Settings} from '../state/schema';
import {ORIGINAL_SPIN_MS,type SpinPlan} from './ReelEngine';
export const ORIGINAL_TICK_OFFSET=5.3,ORIGINAL_TICK_DURATION=.17,ORIGINAL_REVEAL_OFFSET=6.47;
export class OpeningAudio {
 private context:AudioContext|null=null;
 private buffers=new Map<string,AudioBuffer>();
 private sources:AudioBufferSourceNode[]=[];
 private preparing:Promise<void>|null=null;
 constructor(private url:(name:string)=>string){}
 prepare(){
  if(this.preparing)return this.preparing;
  this.preparing=(async()=>{try{
   this.context??=new AudioContext();
   await Promise.all(['case-opening.mp3','high-grade-accent.mp3'].map(async name=>{
    try{const data=await fetch(this.url(name)).then(r=>{if(!r.ok)throw new Error('audio');return r.arrayBuffer();});this.buffers.set(name,await this.context!.decodeAudioData(data));debug('audio.asset-ready',{asset:name});}catch(reason){debug('audio.asset-failed',{asset:name,...errorData(reason)},'warn');}
   }));
  }catch(reason){debug('audio.prepare-failed',errorData(reason),'warn');}})();
  return this.preparing;
 }
 async unlock(){try{this.context??=new AudioContext();await this.context.resume();}catch(reason){debug('audio.unlock-failed',errorData(reason),'warn');}}
 async start(settings:Settings,plan?:SpinPlan){
  if(!settings.sound)return null;
  await this.prepare();await this.unlock();
  if(!this.context)return null;
  const context=this.context,beginning=context.currentTime+.06;
  if(context.state==='suspended'||context.state==='closed')return null;
  if(plan){
   if(!this.buffers.has('case-opening.mp3'))return null;
   // Play the original mixed recording unchanged through the main spin. A
   // short fade in its quiet gap prevents a hard edit before the variable end.
   this.play('case-opening.mp3',settings.volume,beginning,ORIGINAL_SPIN_MS/1000,0,.02);
   plan.ticks.forEach((ms,index)=>{
    if(ms<ORIGINAL_SPIN_MS)return; // These clicks are already inside the MP3.
    this.play('case-opening.mp3',settings.volume*plan.tickSounds[index].gain,beginning+ms/1000,ORIGINAL_TICK_DURATION,ORIGINAL_TICK_OFFSET,.025);
   });
   // Resume the complete original release tail at the actual centered reveal.
   this.play('case-opening.mp3',settings.volume,beginning+plan.revealMs/1000,undefined,ORIGINAL_REVEAL_OFFSET);
  }else if(!this.play('case-opening.mp3',settings.volume,beginning))return null;
  // Follow the audible output clock when available. Suspension freezes both
  // queued audio and motion; the latency fallback covers older implementations.
  const latency=context.outputLatency??context.baseLatency??0;
  let elapsed=0;
  return ()=>{
   const output=context.getOutputTimestamp?.();
   const age=typeof output?.performanceTime==='number'?(performance.now()-output.performanceTime)/1000:Infinity;
   const audible=output&&typeof output.contextTime==='number'&&output.contextTime>0&&age>=0&&age<.15&&context.state==='running'
    ?Math.min(context.currentTime,output.contextTime+age):context.currentTime-latency;
   // Timestamp availability/latency estimates can change between frames.
   // Never rewind the visual reel when the output clock becomes available.
   elapsed=Math.max(elapsed,(audible-beginning)*1000);
   return elapsed;
  };
 }
 private play(name:string,volume:number,when=this.context?.currentTime??0,duration?:number,offset=0,fade=0){
  const buffer=this.buffers.get(name);if(!buffer||!this.context)return false;
  const source=this.context.createBufferSource(),gain=this.context.createGain();source.buffer=buffer;
  gain.gain.value=volume*(name==='high-grade-accent.mp3'?.08:1);source.connect(gain);gain.connect(this.context.destination);
  if(duration&&fade){gain.gain.setValueAtTime(gain.gain.value,when+duration-fade);gain.gain.linearRampToValueAtTime(0,when+duration);}
  source.start(when,offset,duration);source.onended=()=>{source.disconnect();gain.disconnect();this.sources=this.sources.filter(s=>s!==source);};this.sources.push(source);
  return true;
 }
 reveal(grade:number|null,settings:Settings){
  if(!settings.sound)return;
  if(grade!==null&&grade>=8.5)this.play('high-grade-accent.mp3',settings.volume,undefined,grade>=9.5?6:3.5);
 }
 pause(){void this.context?.suspend().catch(()=>{});}
 resume(){void this.context?.resume().catch(()=>{});}
 stop(){for(const source of this.sources){try{source.stop();}catch{/* already ended */}}this.sources=[];}
 dispose(){this.stop();void this.context?.close();}
}
