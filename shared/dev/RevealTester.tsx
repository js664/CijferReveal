import {useState,useMemo} from 'react';
import {createRoot} from 'react-dom/client';
import {OpeningOverlay} from '../opening/OpeningOverlay';
import {OpeningAudio} from '../opening/audio';
import {createSpinPlan,type LandingMode,type SpinPlan} from '../opening/ReelEngine';
import {parseGrade} from '../results/grade-parser';
import type {DisplayResult} from '../results/types';
import '../ui.css';
import '../popup/popup.css';
const fixtures=['*','4,8','6,3','7,8','8,9','9,7','O','M','V','RV','G','ZG','BB','KB','TL','HV','A','EX','N3','GOED+','🧪'];
function Tester(){const [value,setValue]=useState('8,9'),[active,setActive]=useState(false),[reduced,setReduced]=useState(false),[sound,setSound]=useState(true),[volume,setVolume]=useState(.7),[count,setCount]=useState(1),[index,setIndex]=useState(0);
 const [landing,setLanding]=useState<LandingMode|''>(''),[spinPlan,setSpinPlan]=useState<SpinPlan>(()=>createSpinPlan());
 const audio=useMemo(()=>{const a=new OpeningAudio(name=>typeof chrome!=='undefined'&&chrome.runtime?.id?chrome.runtime.getURL(`assets/${name}`):`/assets/${name}`);void a.prepare();return a;},[]);
 const results=useMemo<DisplayResult[]>(()=>Array.from({length:count},(_,i)=>{const result=i?fixtures[i%fixtures.length]:value;return {key:`fixture-${i}`,version:'fixture',subject:i?'Nederlands':'Wiskunde A',description:i?'Hoofdstuk 2 · Tekstbegrip':'Hoofdstuk 3 · Differentiëren',date:'2026-10-04',weight:'2',value:result,grade:parseGrade(result)};}),[count,value]);
 const settings=useMemo(()=>({sound,volume,motion:reduced?'reduce' as const:'system' as const}),[sound,volume,reduced]);
 const commit=useMemo(()=>async()=>{ /* Isolated fixture state: never calls chrome.storage. */ },[]);
 return <><main className="po-popup" style={{width:520,maxWidth:'100%'}}><h1>Opening testen</h1><p>Alle resultaten zijn fixtures. Er worden geen echte gegevens gelezen of opgeslagen.</p><label>Cijfer <select value={value} onChange={e=>setValue(e.target.value)}>{fixtures.map(v=><option key={v}>{v}</option>)}</select></label><p><label>Landing <select value={landing} onChange={e=>setLanding(e.target.value as LandingMode|'')}><option value="">Automatisch</option><option value="soft">Zacht</option><option value="edge">Rand</option><option value="near-miss">Bijna volgende kaart</option></select></label></p><p><label>Aantal <input type="number" min="1" max="5" value={count} onChange={e=>setCount(Math.max(1,Math.min(5,Number(e.target.value))))}/></label></p><p><label><input type="checkbox" checked={reduced} onChange={e=>setReduced(e.target.checked)}/> Verminder beweging</label></p><p><label><input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/> Geluid</label></p><label>Volume <input type="range" min="0" max="1" step=".05" value={volume} onChange={e=>setVolume(Number(e.target.value))}/></label><button onClick={()=>{setIndex(0);setSpinPlan(createSpinPlan(Math.random,landing||undefined,results[0].value));setActive(true);}}>Test opening</button><p>Nonnumeric families, onbekende waarden en versies worden getest met <code>npm test</code>.</p></main>{active&&<OpeningOverlay key={index} result={results[index]} settings={settings} audio={audio} spinPlan={spinPlan} commit={commit} close={()=>{setActive(false);audio.stop();}} next={index<count-1?()=>{setSpinPlan(createSpinPlan(Math.random,landing||undefined,results[index+1]?.value??value));setIndex(i=>i+1);}:undefined} position={index+1} total={count}/>}</>;
}
if(import.meta.env.DEV)createRoot(document.getElementById('root')!).render(<Tester/>);
