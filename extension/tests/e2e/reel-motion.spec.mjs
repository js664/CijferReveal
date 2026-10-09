import {test,expect} from '@playwright/test';
import {ORIGINAL_MAIN_TICKS_MS} from '../../shared/opening/choreography.ts';

test('all landing variants center the real grade and sound every forward and return crossing',async({page})=>{
 test.setTimeout(40000);
 await page.addInitScript(()=>{
  window.audioStarts=[];window.audioContexts=[];
  const Original=window.AudioContext;
  window.AudioContext=class extends Original{constructor(...args){super(...args);window.audioContexts.push(this);this.tickAnalyser=this.createAnalyser();const muted=this.createGain();muted.gain.value=0;this.tickAnalyser.connect(muted);muted.connect(this.destination);}};
  const start=AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start=function(when,...rest){if(this.buffer?.duration>7&&this.buffer?.duration<9)this.connect(this.context.tickAnalyser);window.audioStarts.push({when,duration:this.buffer?.duration,offset:rest[0]??0,clipDuration:rest[1]??null,rate:this.playbackRate.value,context:this.context});return start.call(this,when,...rest);};
 });
 await page.goto('http://127.0.0.1:5174/tester.html');
 const landings=[];
 for(const mode of ['soft','edge','near-miss']){
  await page.getByRole('combobox',{name:'Landing',exact:true}).selectOption(mode);
  await page.getByRole('button',{name:'Test opening',exact:true}).click();
  await page.getByRole('button',{name:'Open Cijfer',exact:true}).click();
  await expect(page.locator('.po-lane')).toBeVisible();
  await page.evaluate(()=>{
   window.reelFrames=[];const lane=document.querySelector('.po-lane'),strip=lane.querySelector('.po-track'),context=window.audioContexts[0];
   const record=()=>{if(!lane.isConnected||document.querySelector('.po-phase-result'))return;
    const output=context.getOutputTimestamp(),time=output.contextTime+(performance.now()-output.performanceTime)/1000;
    const pitch=parseFloat(getComputedStyle(strip.children[0]).width)+parseFloat(getComputedStyle(strip).columnGap);
    const samples=new Float32Array(context.tickAnalyser.fftSize);context.tickAnalyser.getFloatTimeDomainData(samples);
    const energy=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);
    window.reelFrames.push({time,position:new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41,pitch,energy});requestAnimationFrame(record);
   };requestAnimationFrame(record);
   const observer=new MutationObserver(()=>{if(!document.querySelector('.po-phase-stopped'))return;
    const marker=lane.querySelector('.po-marker').getBoundingClientRect(),target=lane.querySelector('[data-target-folio="true"]').getBoundingClientRect();
    window.reelLanding={inside:marker.left>target.left&&marker.left<target.right,offset:Number(lane.dataset.landingOffset),mode:lane.dataset.landingMode,approachMs:Number(lane.dataset.approachMs),target:Number(lane.dataset.targetIndex),centerError:Math.abs(marker.left+marker.width/2-target.left-target.width/2)};observer.disconnect();
   });observer.observe(document.querySelector('.po-opening-overlay'),{attributes:true,attributeFilter:['class']});
  });
  await expect(page.locator('.po-grade')).toHaveText('8,9',{timeout:10000});
  const report=await page.evaluate(originalTicks=>{
   const starts=window.audioStarts.map(({when,duration,offset,clipDuration,rate})=>({when,duration,offset,clipDuration,rate})),frames=window.reelFrames;
   const ticks=starts.filter(s=>s.clipDuration===.17),begin=starts.find(s=>s.clipDuration===3.5&&s.offset===0).when;
   const crossings=[];
   for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i];
    // Convert screen translation back to logical card position (initial index 4).
    const width=document.querySelector('.po-lane')?.clientWidth??0;
    const card=width/2-(a.pitch-20)/2-4*a.pitch;
    const pa=(card-a.position)/a.pitch,pb=(card-b.position)/b.pitch;
    for(let boundary=Math.floor(pa+.5)+.5;boundary<=pb;boundary++)crossings.push({boundary,direction:1,time:a.time+(b.time-a.time)*(boundary-pa)/(pb-pa)});
    if(pb<pa)for(let boundary=Math.floor(pa-.5)+.5;boundary>=pb;boundary--)crossings.push({boundary,direction:-1,time:a.time+(b.time-a.time)*(boundary-pa)/(pb-pa)});
   }
   const errors=crossings.map(c=>{
    const index=Math.floor(c.boundary),expected=c.direction<0?ticks.at(-1)?.when:index<24?begin+originalTicks[index]/1000:ticks[index-24]?.when;
    return Math.abs(c.time-expected)*1000;
   }).filter(Number.isFinite);
   return {starts,frameCount:frames.length,tickEnergy:Math.max(...frames.map(f=>f.energy)),maxReverse:Math.max(...frames.slice(1).map((f,i)=>f.time<begin+window.reelLanding.approachMs/1000-.08?f.position-frames[i].position:0)),landing:window.reelLanding,ticks:ticks.length,errors,begin};
  },ORIGINAL_MAIN_TICKS_MS);
  expect(report.frameCount).toBeGreaterThan(80);expect(report.tickEnergy).toBeGreaterThan(.001);expect(report.maxReverse).toBeLessThan(.1);
  expect(report.landing.inside).toBe(true);expect(report.landing.centerError).toBeLessThan(1);expect(report.landing.mode).toBe(mode);expect(report.ticks).toBe(report.landing.target-4-24+(mode==='near-miss'?2:0));
  expect(report.starts.filter(s=>s.offset===0&&s.clipDuration===3.5&&s.duration>7&&s.duration<9)).toHaveLength(1);
  expect(report.starts.filter(s=>s.offset===6.47&&s.clipDuration===null)).toHaveLength(1);
  expect(report.starts.every(s=>s.rate===1)).toBe(true);
  expect(report.errors.length).toBeGreaterThan(20);expect(Math.max(...report.errors)).toBeLessThan(65);
  landings.push(report.landing);await page.getByRole('button',{name:'Terug naar SOMtoday'}).click();
  await page.evaluate(()=>{window.audioStarts=[];});
 }
 expect(new Set(landings.map(l=>l.offset)).size).toBe(3);
});

test('muted reel stays smooth through viewport changes and Escape cancels it',async({page})=>{
 await page.goto('http://127.0.0.1:5174/tester.html');await page.getByLabel('Geluid',{exact:true}).uncheck();
 await page.getByRole('button',{name:'Test opening',exact:true}).click();await page.keyboard.press('Enter');
 await expect(page.locator('.po-lane')).toBeVisible();await page.setViewportSize({width:390,height:844});
 await expect(page.locator('[data-target-folio="true"] .po-mystery-grade')).toHaveText('8,9');
 await page.keyboard.press('Escape');await expect(page.locator('.po-opening-overlay')).toHaveCount(0);
 await page.getByRole('button',{name:'Test opening',exact:true}).click();await page.keyboard.press('Enter');
 await expect(page.locator('.po-grade')).toHaveText('8,9',{timeout:10000});
});

test('background suspension freezes the shared timeline and resumes without a stale-clock jump',async({page})=>{
 await page.addInitScript(()=>{
  window.fixtureHidden=false;Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.fixtureHidden});
  const Original=window.AudioContext;window.AudioContext=class extends Original{constructor(...args){super(...args);window.fixtureAudio=this;}};
 });
 await page.goto('http://127.0.0.1:5174/tester.html');await page.getByRole('button',{name:'Test opening',exact:true}).click();await page.keyboard.press('Enter');
 await expect(page.locator('.po-lane')).toBeVisible();await page.waitForTimeout(1100);
 await page.evaluate(()=>{window.fixtureHidden=true;document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.evaluate(()=>window.fixtureAudio.state)).toBe('suspended');await page.waitForTimeout(80);
 const before=await page.evaluate(()=>({position:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.po-track')).transform).m41,time:window.fixtureAudio.currentTime}));
 await page.waitForTimeout(1000);
 const paused=await page.evaluate(()=>({position:new DOMMatrixReadOnly(getComputedStyle(document.querySelector('.po-track')).transform).m41,time:window.fixtureAudio.currentTime}));
 expect(paused.time).toBe(before.time);expect(paused.position).toBeCloseTo(before.position,3);await expect(page.locator('.po-grade')).toHaveCount(0);
 await page.evaluate(()=>{window.fixtureHidden=false;document.dispatchEvent(new Event('visibilitychange'));});
 await expect.poll(()=>page.evaluate(()=>window.fixtureAudio.state)).toBe('running');await page.waitForTimeout(80);
 const after=await page.evaluate(()=>{const strip=document.querySelector('.po-track');return {position:new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41,time:window.fixtureAudio.currentTime,pitch:parseFloat(getComputedStyle(strip.children[0]).width)+parseFloat(getComputedStyle(strip).columnGap)};});
 // Use elapsed audio time, including Playwright's asynchronous polling delay.
 // A stale timestamp would incorrectly add the whole 1-second hidden interval.
 expect(after.position).toBeLessThan(paused.position);
 expect(paused.position-after.position).toBeLessThan(after.pitch*20*(after.time-paused.time+.05));
 await expect(page.locator('.po-grade')).toHaveText('8,9',{timeout:9000});
});
