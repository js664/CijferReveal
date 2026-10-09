import {createRoot} from 'react-dom/client';
import {motion} from 'motion/react';
import type {DisplayResult,ResultRecord} from '../../shared/results/types';
import type {Lifecycle} from '../../shared/state/schema';
import {cardFields,fieldTextNodes} from '../somtoday/dom-card';
export interface Presentation { host:HTMLElement;update:(result:ResultRecord|null,status:Lifecycle|undefined,display:DisplayResult|undefined,onOpen:(result:DisplayResult,origin:HTMLElement)=>void,onRetry?:()=>void)=>void;dispose:()=>void; }
const MASK='?';
type NativeValue={element:HTMLElement|null;parts:{node:Text;text:string}[]};
type NativeSnapshot={grade:NativeValue;weight:NativeValue};
const nativeSnapshots=new WeakMap<HTMLElement,NativeSnapshot>();
const captureNative=(element:HTMLElement|null):NativeValue=>{
 if(!element)return {element:null,parts:[]};
 const parts=fieldTextNodes(element).map(node=>({node,text:node.nodeValue??''}));
 return {element,parts};
};
const isMasked=(value:NativeValue)=>{
 const current=fieldTextNodes(value.element);
 return value.parts.length>0&&current.length===value.parts.length&&value.parts.every((part,index)=>current[index]===part.node&&part.node.nodeValue===MASK);
};
function readNative(owner:HTMLElement,field:'grade'|'weight'){
 const node=cardFields(owner)[field],current=fieldTextNodes(node).map(part=>part.nodeValue??'').join(''),snapshot=nativeSnapshots.get(owner),saved=snapshot?.[field];
 if(saved?.element===node&&isMasked(saved))return saved.parts.map(part=>part.text).join('');
 if(snapshot)snapshot[field]=captureNative(node);else nativeSnapshots.set(owner,{grade:field==='grade'?captureNative(node):captureNative(null),weight:field==='weight'?captureNative(node):captureNative(null)});
 return current;
}
export function nativeCardValues(owner:HTMLElement){return {value:readNative(owner,'grade'),weight:readNative(owner,'weight')};}
function maskNativeValues(owner:HTMLElement,blocked:boolean){
 const snapshot=nativeSnapshots.get(owner)??{grade:captureNative(null),weight:captureNative(null)};
 const fields=cardFields(owner);
 for(const field of ['grade','weight'] as const){
  const node=fields[field];if(!node)continue;
  if(snapshot[field].element!==node||!isMasked(snapshot[field]))snapshot[field]=captureNative(node);
  const saved=snapshot[field];
  if(blocked){for(const part of saved.parts)if(part.node.nodeValue!==MASK)part.node.nodeValue=MASK;}
  else if(isMasked(saved)){for(const part of saved.parts)part.node.nodeValue=part.text;}
 }
 nativeSnapshots.set(owner,snapshot);
}
function Actions({pending,opened,unresolved,display,onOpen,onRetry}:{pending:boolean;opened:boolean;unresolved:boolean;display:DisplayResult|undefined;onOpen:(result:DisplayResult,origin:HTMLElement)=>void;onRetry?:()=>void}){
 return <>{pending&&display&&<div className="po-card-cover"><motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:.22}}><strong>NIEUW CIJFER</strong><br/><button className="po-open" onClick={e=>{e.stopPropagation();onOpen(display,e.currentTarget);}}>Open cijfer</button></motion.div></div>}{opened&&display&&<button className="po-replay" type="button" aria-label="Cijfer opnieuw openen" title="Opnieuw openen" onClick={e=>{e.stopPropagation();onOpen(display,e.currentTarget);}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M19 12a7 7 0 1 1-2-4.95L20 12"/></svg></button>}{unresolved&&<div className="po-card-cover po-unresolved"><span>Cijfer nog niet gekoppeld</span>{onRetry&&<button className="po-open" onClick={e=>{e.stopPropagation();onRetry();}}>Pagina opnieuw laden</button>}</div>}</>;
}
export function presentCard(owner:HTMLElement,result:ResultRecord|null,status:Lifecycle|undefined,display:DisplayResult|undefined,onOpen:(result:DisplayResult,origin:HTMLElement)=>void,onRetry?:()=>void):Presentation{
 const host=document.createElement('div');host.className='po-safe-native';host.style.width='100%';if(display)host.dataset.poKey=display.key;
 const parent=owner.parentNode;if(!parent)throw new Error('Result card has no parent.');
 parent.insertBefore(host,owner);host.append(owner);owner.classList.add('po-preserved-owner');
 const mount=document.createElement('div');mount.className='po-native-effects';host.append(mount);const root=createRoot(mount);
 const snapshots=new Map<HTMLElement,Map<string,string|null>>();
 for(const node of [owner,...owner.querySelectorAll<HTMLElement>('[aria-label],[title],[aria-describedby],[aria-labelledby]')])snapshots.set(node,new Map(['aria-hidden','aria-label','title','aria-describedby','aria-labelledby'].map(a=>[a,node.getAttribute(a)])));
 const originalInert=owner.inert;let disposed=false;
 const update=(nextResult:ResultRecord|null,nextStatus:Lifecycle|undefined,nextDisplay:DisplayResult|undefined,nextOpen:typeof onOpen,nextRetry=onRetry)=>{
 if(disposed)return;
 const pending=nextStatus==='pending'&&!!nextDisplay;
 const opened=nextStatus==='opened'&&!!nextDisplay;
 const unresolved=!nextResult||nextStatus==='unresolved'||!nextStatus;
 const safeGrade=!!nextResult&&(nextStatus==='baseline'||nextStatus==='opened'||nextStatus==='observed-nonnumeric');
 const blocked=!safeGrade;
 host.classList.toggle('po-pending',pending);host.classList.toggle('po-mask-grade',blocked);host.classList.toggle('po-unresolved-state',!nextResult||nextStatus==='unresolved'||!nextStatus);
 if(nextDisplay)host.dataset.poKey=nextDisplay.key;else delete host.dataset.poKey;
 owner.inert=blocked;
 if(blocked)owner.setAttribute('aria-hidden','true');else owner.removeAttribute('aria-hidden');
 maskNativeValues(owner,blocked);
 for(const [node,attrs] of snapshots){if(blocked){for(const attr of ['aria-label','title','aria-describedby','aria-labelledby'])node.removeAttribute(attr);}else{for(const [attr,value] of attrs){if(value===null)node.removeAttribute(attr);else node.setAttribute(attr,value);}}}
 root.render(<Actions pending={pending} opened={opened} unresolved={unresolved} display={nextDisplay??undefined} onOpen={nextOpen} onRetry={nextRetry}/>);
 };
 const resetTilt=()=>{host.classList.remove('po-is-tilting','po-is-hover');host.style.setProperty('--po-tilt-rx','0deg');host.style.setProperty('--po-tilt-ry','0deg');};
 host.addEventListener('pointermove',event=>{if(event.pointerType==='touch'||!owner.querySelector('.root'))return;const rect=host.getBoundingClientRect();if(!rect.width||!rect.height)return;const x=Math.max(0,Math.min(1,(event.clientX-rect.left)/rect.width)),y=Math.max(0,Math.min(1,(event.clientY-rect.top)/rect.height));host.style.setProperty('--po-tilt-rx',`${(0.5-y)*8}deg`);host.style.setProperty('--po-tilt-ry',`${(x-0.5)*8}deg`);host.style.setProperty('--po-tilt-gx',`${x*100}%`);host.style.setProperty('--po-tilt-gy',`${y*100}%`);host.classList.add('po-is-tilting','po-is-hover');});
 host.addEventListener('pointerleave',resetTilt);host.addEventListener('pointercancel',resetTilt);
 const originalParent=parent,originalNext=host.nextSibling;
 const dispose=()=>{if(disposed)return;disposed=true;resetTilt();root.unmount();maskNativeValues(owner,false);owner.classList.remove('po-preserved-owner');owner.inert=originalInert;for(const [node,attrs] of snapshots)for(const [attr,value] of attrs){if(value===null)node.removeAttribute(attr);else node.setAttribute(attr,value);}if(host.isConnected){if(owner.isConnected)originalParent.insertBefore(owner,originalNext?.parentNode===originalParent?originalNext:host);host.remove();}};
 const presentation={host,update,dispose};update(result,status,display,onOpen,onRetry);return presentation;
}
