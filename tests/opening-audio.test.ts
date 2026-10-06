import {it,expect,vi,afterEach} from 'vitest';
import {OpeningAudio,ORIGINAL_TICK_OFFSET,ORIGINAL_TICK_DURATION,ORIGINAL_REVEAL_OFFSET} from '../src/opening/audio';
import {createSpinPlan,ORIGINAL_SPIN_MS} from '../src/opening/ReelEngine';

afterEach(()=>vi.unstubAllGlobals());
it('plays the complete original opening cue and pauses the audio clock with the visual clock',async()=>{
 const starts:{name:string;when:number;duration?:number;offset:number}[]=[],resume=vi.fn(async()=>{}),suspend=vi.fn(async()=>{}),stops=vi.fn();
 class Context {
  static active:Context;
  currentTime=10;outputLatency=.04;destination={};resume=resume;suspend=suspend;
  constructor(){Context.active=this;}
  async decodeAudioData(data:ArrayBuffer){return {name:(data as ArrayBuffer&{name:string}).name};}
  createBufferSource(){return {playbackRate:{value:1},buffer:null as {name:string}|null,connect(){},disconnect(){},onended:null,start(when:number,offset:number,duration?:number){starts.push({name:this.buffer!.name,when,duration,offset});},stop:stops};}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 vi.stubGlobal('AudioContext',Context);
 const audio=new OpeningAudio(name=>name);
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>Object.assign(new ArrayBuffer(0),{name:url})})));
 await audio.prepare();const clock=await audio.start({sound:true,volume:.7,motion:'system'});
 expect(starts).toEqual([{name:'case-opening.mp3',when:10.06,duration:undefined,offset:0}]);
 expect(clock!()).toBe(0);Context.active.currentTime=11.1;expect(clock!()).toBeCloseTo(1000,6);
 audio.reveal(6.3,{sound:true,volume:.7,motion:'system'});expect(starts).toHaveLength(1);
 audio.pause();audio.resume();expect(suspend).toHaveBeenCalledOnce();expect(resume).toHaveBeenCalled();
 expect(clock!()).toBeCloseTo(1000,6);Context.active.currentTime=16.57;expect(clock!()).toBeCloseTo(6470,6);
 audio.stop();expect(stops).toHaveBeenCalledOnce();
});
it('plays the original main spin once, schedules only ending clicks, and resumes its full release tail',async()=>{
 const starts:{name:string;when:number;duration?:number;offset:number}[]=[],stops=vi.fn();
 class Context {
  currentTime=10;state='running';outputLatency=.04;destination={};
  async resume(){} async suspend(){}
  async decodeAudioData(data:ArrayBuffer){return {name:(data as ArrayBuffer&{name:string}).name};}
  createBufferSource(){return {playbackRate:{value:1},buffer:null as {name:string}|null,connect(){},disconnect(){},onended:null,start(when:number,offset:number,duration?:number){starts.push({name:this.buffer!.name,when,duration,offset});},stop:stops};}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 vi.stubGlobal('AudioContext',Context);
 const fetcher=vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>Object.assign(new ArrayBuffer(0),{name:url})}));vi.stubGlobal('fetch',fetcher);
 const audio=new OpeningAudio(name=>name),plan=createSpinPlan(()=>.5),settings={sound:true,volume:.7,motion:'system' as const};
 await audio.prepare();const clock=await audio.start(settings,plan);expect(clock).toBeTypeOf('function');
 const lateTicks=plan.ticks.filter(ms=>ms>=ORIGINAL_SPIN_MS),ticks=starts.filter(s=>s.duration===ORIGINAL_TICK_DURATION);expect(ticks).toHaveLength(lateTicks.length);
 expect(starts[0]).toEqual({name:'case-opening.mp3',when:10.06,duration:3.5,offset:0});
 ticks.forEach((tick,i)=>expect(tick.when).toBeCloseTo(10.06+lateTicks[i]/1000,10));
 expect(ticks.every(s=>s.offset===ORIGINAL_TICK_OFFSET&&s.when>=13.56)).toBe(true);
 expect(starts.every(s=>s.name==='case-opening.mp3')).toBe(true);
 expect(starts.at(-1)).toEqual({name:'case-opening.mp3',when:10.06+plan.revealMs/1000,duration:undefined,offset:ORIGINAL_REVEAL_OFFSET});
 audio.stop();expect(stops).toHaveBeenCalledTimes(lateTicks.length+2);
 await audio.start(settings,plan);expect(fetcher).toHaveBeenCalledTimes(2);
});
it('uses output timestamps for device latency, freezes on suspension and remains silent if a required sample is missing',async()=>{
 const starts=vi.fn();
 class Context {
  static active:Context;
  currentTime=12;state='running';outputLatency=.04;destination={};
  constructor(){Context.active=this;}
  async resume(){} async suspend(){this.state='suspended';}
  getOutputTimestamp(){return {contextTime:11,performanceTime:performance.now()-100};}
  async decodeAudioData(){return {};}
  createBufferSource(){return {playbackRate:{value:1},connect(){},disconnect(){},start:starts,stop(){}};}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 vi.stubGlobal('AudioContext',Context);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})));
 const audio=new OpeningAudio(name=>name),settings={sound:true,volume:.7,motion:'system' as const};
 const clock=await audio.start(settings,createSpinPlan(()=>.5));Context.active.currentTime=14;
 // Audible time is 11.1, not the audio rendering thread's 14 seconds.
 expect(clock!()).toBe(0);audio.pause();expect(clock!()).toBeCloseTo(1900,2);
 audio.stop();vi.stubGlobal('fetch',vi.fn(async()=>({ok:false})));
 const missing=new OpeningAudio(name=>name);expect(await missing.start(settings,createSpinPlan())).toBeNull();
 expect(await missing.start({...settings,sound:false},createSpinPlan())).toBeNull();
});
it('never rewinds when the browser switches from latency fallback to output timestamps',async()=>{
 class Context {
  static active:Context;currentTime=10;state='running';outputLatency=.04;destination={};output=0;
  constructor(){Context.active=this;}async resume(){}
  getOutputTimestamp(){return {contextTime:this.output,performanceTime:performance.now()};}
  async decodeAudioData(){return {};}
  createBufferSource(){return {connect(){},disconnect(){},start(){},stop(){}};}
  createGain(){return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
 }
 vi.stubGlobal('AudioContext',Context);vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)})));
 const clock=await new OpeningAudio(name=>name).start({sound:true,volume:.7,motion:'system'});
 Context.active.currentTime=13;expect(clock!()).toBeCloseTo(2900,3);
 Context.active.output=12.8;expect(clock!()).toBeCloseTo(2900,3);
 Context.active.currentTime=13.5;Context.active.output=13.46;expect(clock!()).toBeCloseTo(3400,1);
});
