import {it,expect,vi,afterEach} from 'vitest';
import {createSpinPlan,reelProgress,ReelEngine,ORIGINAL_SPIN_MS} from '../src/opening/ReelEngine';
const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
afterEach(()=>vi.unstubAllGlobals());
it('1000 plans brake smoothly, only reverse during the deliberate settle, and finish at the true center',()=>{
 for(let seed=1;seed<=1000;seed++){
  const p=createSpinPlan(seeded(seed)),speed=(t:number)=>reelProgress(t+.1,p)-reelProgress(t,p);
  expect(reelProgress(0,p)).toBe(0);expect(reelProgress(p.stopMs,p)).toBe(p.distance);
  expect(Math.round(p.initialIndex+p.distance)).toBe(p.targetIndex);
  expect(Math.abs(p.landingOffset)).toBeLessThanOrEqual(.60);
  expect(speed(p.stopMs-.1)).toBeLessThan(.000001);
  let position=0,previousSpeed=Infinity;
  for(let t=0;t<=p.approachMs;t+=10){const next=reelProgress(t,p);expect(next).toBeGreaterThanOrEqual(position-1e-10);position=next;
   if(t>=p.brakeMs){const v=speed(t);expect(v).toBeLessThanOrEqual(previousSpeed+1e-9);previousSpeed=v;}
  }
  for(const join of [p.startMs+p.accelerationMs,p.brakeMs,p.approachMs,p.stopMs])expect(Math.abs(speed(join-.1)-speed(join))).toBeLessThan(.000001);
  position=reelProgress(p.approachMs,p);expect(position).toBeCloseTo(p.distance+p.landingOffset,9);
  for(let t=p.approachMs+5;t<=p.stopMs;t+=5){const next=reelProgress(t,p);
   expect(next).toBeGreaterThanOrEqual(Math.min(p.distance,p.distance+p.landingOffset)-1e-9);
   expect(next).toBeLessThanOrEqual(Math.max(p.distance,p.distance+p.landingOffset)+1e-9);
   expect((next-position)*p.landingOffset).toBeLessThanOrEqual(1e-9);position=next;
  }
  expect(Object.isFrozen(p)).toBe(true);
 }
},15000);
it('every planned tick is exactly a marker crossing, with increasing intervals as the reel brakes',()=>{
 for(let seed=1;seed<=100;seed++){
  const p=createSpinPlan(seeded(seed));
  expect(p.ticks).toHaveLength(p.distance+(p.landingMode==='near-miss'?2:0));
  for(const [i,t] of p.ticks.entries()){
   const boundary=p.tickDirections[i]<0?p.distance+.5:i+.5;
   expect(reelProgress(t,p)).toBeCloseTo(boundary,9);expect(t).toBeLessThan(p.stopMs);
   expect(Math.sign(reelProgress(t+.01,p)-reelProgress(t-.01,p))).toBe(p.tickDirections[i]);
  }
  let previous=0;
  for(let i=1;i<p.ticks.length;i++)if(p.ticks[i-1]>=p.brakeMs&&p.tickDirections[i]>0){const interval=p.ticks[i]-p.ticks[i-1];expect(interval).toBeGreaterThanOrEqual(previous);previous=interval;}
 }
});
it('changes winner slots, last crossing times, landing sides and decoys without changing a result',()=>{
 const plans=Array.from({length:100},(_,i)=>createSpinPlan(seeded(i*98765+1)));
 expect(new Set(plans.map(p=>p.targetIndex)).size).toBe(5);
 expect(plans.some(p=>p.landingOffset<-.25)).toBe(true);expect(plans.some(p=>p.landingOffset>.54)).toBe(true);
 expect(new Set(plans.map(p=>p.landingMode)).size).toBe(3);
 expect(new Set(plans.map(p=>Math.round(p.stopMs-p.ticks.at(-1)!))).size).toBeGreaterThan(30);
 for(const p of plans)for(let grade=2;grade<=9;grade++)expect(p.grades.some(v=>v.startsWith(`${grade},`))).toBe(true);
});
it.each(['soft','edge','near-miss'] as const)('%s has a bounded centered settle and original-pitch ending clicks',mode=>{
 const p=createSpinPlan(seeded(42),mode);
 expect(p.landingMode).toBe(mode);expect(reelProgress(p.stopMs,p)).toBe(p.targetIndex-p.initialIndex);
 expect(p.stopMs-p.approachMs).toBeGreaterThanOrEqual(mode==='near-miss'?440:320);
 expect(p.tickSounds.every(s=>s.rate>=.99&&s.rate<=1.01&&s.gain>0&&s.gain<=1.1)).toBe(true);
 expect(p.tickSounds.every(s=>s.sample==='case-opening.mp3'&&s.rate===1)).toBe(true);
 if(mode==='near-miss'){
  expect(Math.round(p.initialIndex+reelProgress(p.approachMs,p))).toBe(p.targetIndex+1);
  expect(p.tickDirections.at(-1)).toBe(-1);expect(p.tickSounds.at(-1)!.gain).toBeLessThan(.5);
 }else expect(Math.round(p.initialIndex+reelProgress(p.approachMs,p))).toBe(p.targetIndex);
});
it('dropped frames land and reveal exactly once, and cancellation prevents future work',()=>{
 const p=createSpinPlan(seeded(8));let callback:FrameRequestCallback=()=>{},clock=0;
 vi.stubGlobal('requestAnimationFrame',vi.fn((f:FrameRequestCallback)=>{callback=f;return 1;}));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const paint=vi.fn(),landed=vi.fn(),done=vi.fn(),engine=new ReelEngine(p,paint,done,landed);
 engine.start(()=>clock);callback(0);clock=p.stopMs+20;callback(0);clock=p.revealMs;callback(0);
 expect(landed).toHaveBeenCalledOnce();expect(done).toHaveBeenCalledOnce();expect(paint).toHaveBeenLastCalledWith(p.distance);
 engine.cancel();callback(0);expect(done).toHaveBeenCalledOnce();expect(cancelAnimationFrame).toHaveBeenCalledOnce();
});

it('every variation shares the original recording’s main-spin trajectory and changes only after the handoff',()=>{
 const reference=createSpinPlan(seeded(1));
 for(let seed=2;seed<=50;seed++){const plan=createSpinPlan(seeded(seed));expect(plan.brakeMs).toBe(ORIGINAL_SPIN_MS);
  for(let ms=0;ms<=ORIGINAL_SPIN_MS;ms+=10)expect(reelProgress(ms,plan)).toBeCloseTo(reelProgress(ms,reference),10);
  expect(plan.ticks.filter(ms=>ms<ORIGINAL_SPIN_MS)).toHaveLength(24);
 }
});
