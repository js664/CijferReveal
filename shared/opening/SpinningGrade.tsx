import {useEffect,useId,useRef,useState} from 'react';
export function SpinningGrade({value,reduced}:{value:string;reduced:boolean}){
 return /[0-9]/.test(value)?<GradeReel key={`${value}:${reduced}`} value={value} reduced={reduced}/>:<>{value}</>;
}
function GradeReel({value,reduced}:{value:string;reduced:boolean}){
 const [settled,setSettled]=useState(reduced),root=useRef<HTMLSpanElement>(null);
 const id=useId().replace(/[^a-zA-Z0-9_-]/g,'');
 useEffect(()=>{
 if(reduced)return;
 const strips=[...root.current!.querySelectorAll<HTMLElement>('.po-digit-strip')];
 const blurs=[...root.current!.querySelectorAll<SVGFEGaussianBlurElement>('feGaussianBlur')];
 const start=performance.now();let frame=0;
 const draw=()=>{const elapsed=performance.now()-start;let complete=true;
 strips.forEach((strip,i)=>{const progress=Math.max(0,Math.min(1,(elapsed-i*90)/1400));if(progress<1)complete=false;
 const ease=1-(1-progress)**4,target=Number(strip.dataset.target),cells=strip.children.length;
 strip.style.transform=`translate3d(0,${-target*ease*100/cells}%,0)`;
 blurs[i]?.setAttribute('stdDeviation',`0 ${3*(1-progress)**2}`);
 });
 if(complete)setSettled(true);else frame=requestAnimationFrame(draw);
 };frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[reduced,value]);
 if(settled||reduced)return <>{value}</>;
 let column=0;
 return <span className="po-digit-reel" ref={root} aria-hidden="true">{[...value].map((char,index)=>{
 if(!/[0-9]/.test(char))return <span className="po-digit-separator" key={index}>{char}</span>;
 const target=20+Number(char),filterId=`po-digit-${id}-${column++}`;
 return <span className="po-digit-col" key={index}><svg className="po-digit-filter" aria-hidden="true"><defs><filter id={filterId} x="-10%" y="-20%" width="120%" height="140%"><feGaussianBlur stdDeviation="0 3"/></filter></defs></svg><span className="po-digit-strip" data-target={target} style={{filter:`url(#${filterId})`}}>{Array.from({length:31},(_,n)=><span className="po-digit-cell" key={n}>{n%10}</span>)}</span></span>;
 })}</span>;
}
