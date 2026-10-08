import {useEffect,useRef} from 'react';
import {tierFor} from './tiers';
export function Particles({grade}:{grade:number|null}){const ref=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{const canvas=ref.current!,ctx=canvas.getContext('2d');if(!ctx)return;const tier=tierFor(grade),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*devicePixelRatio;canvas.height=h*devicePixelRatio;ctx.scale(devicePixelRatio,devicePixelRatio);
 const count=grade===null?12:tier.particles;
 const points=Array.from({length:count},(_,i)=>{const angle=i/count*Math.PI*2;return {dx:Math.cos(angle)*(90+Math.random()*240),dy:Math.sin(angle)*(80+Math.random()*190),size:1+Math.random()*2};});
 const start=performance.now();let frame=0;const draw=()=>{const t=(performance.now()-start)/1600;ctx.clearRect(0,0,w,h);if(t>=1)return;ctx.fillStyle=tier.color;ctx.globalAlpha=(1-t)**2;
 for(const p of points){const x=w/2+p.dx*(.5+t),y=h/2+p.dy*(.5+t)+70*t*t;if(Math.abs(x-w/2)<110&&Math.abs(y-h/2)<130)continue;ctx.fillRect(x,y,p.size,p.size*2);}frame=requestAnimationFrame(draw);};draw();return()=>cancelAnimationFrame(frame);
 },[grade]);return <canvas className="po-particles" ref={ref} aria-hidden="true"/>;}
