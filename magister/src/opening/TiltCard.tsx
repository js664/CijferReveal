import {useRef,type ReactNode,type PointerEvent} from 'react';
export function TiltCard({children,reduced}:{children:ReactNode;reduced:boolean}){
 const ref=useRef<HTMLDivElement>(null);
 const reset=()=>{const el=ref.current;if(!el)return;el.classList.remove('po-is-tilting','po-is-hover');el.style.setProperty('--po-tilt-rx','0deg');el.style.setProperty('--po-tilt-ry','0deg');};
 const move=(event:PointerEvent<HTMLDivElement>)=>{
 if(reduced||event.pointerType==='touch'&&event.buttons===0)return;
 const el=event.currentTarget,rect=el.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));
 el.style.setProperty('--po-tilt-rx',`${(0.5-y)*12}deg`);el.style.setProperty('--po-tilt-ry',`${(x-0.5)*12}deg`);el.style.setProperty('--po-tilt-gx',`${x*100}%`);el.style.setProperty('--po-tilt-gy',`${y*100}%`);el.classList.add('po-is-tilting','po-is-hover');
 };
 return <div className={`po-tilt${reduced?' po-tilt-reduced':''}`} ref={ref} onPointerMove={move} onPointerLeave={reset} onPointerCancel={reset} onPointerUp={e=>{if(e.pointerType==='touch')reset();}} onPointerDown={e=>{if(e.pointerType==='touch'&&!reduced){e.currentTarget.setPointerCapture?.(e.pointerId);move(e);}}}><div className="po-tilt-card">{children}<div className="po-tilt-glare" aria-hidden="true"/></div></div>;
}
