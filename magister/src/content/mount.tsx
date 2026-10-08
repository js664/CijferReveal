import {debug} from '../magister/debug';
import {createRoot,type Root} from 'react-dom/client';
import {OpeningOverlay} from '../opening/OpeningOverlay';
import {OpeningAudio} from '../opening/audio';
import {CollectionView} from '../collection/CollectionView';
import {inventoryParent,hideInventoryContent} from '../collection/InventoryMount';
import type {CollectionEntry} from '../state/schema';
import type {DisplayResult} from '../somtoday/types';
import type {State} from '../state/schema';
import {command} from '../state/repository';
import {queue} from '../state/classifier';
import uiCSS from '../shared/ui.css?inline';
export class Experience {
 private host:HTMLElement|null=null;private root:Root|null=null;private origin:HTMLElement|null=null;private originKey:string|null=null;private inerted:{node:HTMLElement;value:boolean}[]=[];private scroll='';private collectionMode=false;private restoreInventory:(()=>void)|null=null;private inventoryViewportCleanup:(()=>void)|null=null;
 readonly audio=new OpeningAudio(name=>chrome.runtime.getURL(`assets/${name}`));
 constructor(private state:()=>State|null,private changed:()=>Promise<void>,private visibleResults?:()=>Set<string>){}
 get active(){if(this.host&&!this.host.isConnected){this.close();return false;}return !!this.host;}
 get collectionActive(){return this.active&&this.collectionMode;}
 get inventoryActive(){return this.active&&this.collectionMode;}
 private create(parent:HTMLElement=document.body,inventory=false){
 this.host=document.createElement('div');this.host.className=`po-experience-host${inventory?' po-inventory-host':''}`;if(inventory)this.host.style.visibility='hidden';parent.append(this.host);const shadow=this.host.attachShadow({mode:'closed'});const style=document.createElement('style');style.textContent=uiCSS;shadow.append(style);const mount=document.createElement('div');shadow.append(mount);this.root=createRoot(mount);
 }
 open(result:DisplayResult,origin:HTMLElement,scope:string){if(this.active){debug('opening.busy',{},'warn');return;}debug('opening.requested');void this.audio.prepare();this.origin=origin;this.originKey=origin.closest<HTMLElement>('.po-safe-native')?.dataset.poKey??null;this.create();
 this.inerted=[...document.body.children].filter(n=>n!==this.host&&n instanceof HTMLElement&&!n.hasAttribute('data-po-debug')).map(n=>({node:n as HTMLElement,value:(n as HTMLElement).inert}));this.inerted.forEach(({node})=>node.inert=true);this.scroll=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 const s=this.state();if(!s){this.close();return;}
 const visibleKeys=this.visibleResults?.()??new Set([...document.querySelectorAll<HTMLElement>('.po-safe-native.po-pending[data-po-key]')].map(card=>card.dataset.poKey));
 const replay=s.records[result.key]?.state==='opened';const rest=queue(s,scope).filter(r=>r.key!==result.key&&visibleKeys.has(r.key)).map(r=>r.display!);const results=[{display:result,replay},...rest.map(display=>({display,replay:false}))];let index=0;
 const settings={...s.settings};
 const commit=async(r:DisplayResult)=>{await command({kind:'open',key:r.key,version:r.version,scope,generation:s.resetGeneration});window.setTimeout(()=>{void this.changed().catch(()=>{/* The durable open succeeded; refresh native grade data after the reveal. */});},150);};
 const cancel=async(r:DisplayResult)=>{await command({kind:'cancel-open',key:r.key,version:r.version,scope,generation:s.resetGeneration});await this.changed();};
 const render=()=>{const current=results[index];this.root!.render(<OpeningOverlay key={`${current.display.key}:${index}`} result={current.display} replay={current.replay} settings={settings} audio={this.audio} commit={commit} cancel={cancel} close={()=>this.close()} next={index<results.length-1?()=>{index++;render();}:undefined} position={index+1} total={results.length}/>);};render();
 }
 showInventory(scope:string|null,origin:HTMLElement,route:HTMLElement|null,verified:boolean,onGoGrades:()=>void){if(this.active||!route?.parentElement)return false;this.origin=origin;this.collectionMode=true;
 const parent=inventoryParent(route,origin);this.create(parent,true);
 this.host!.style.fontFamily=getComputedStyle(route).fontFamily||'"Open Sans", sans-serif';
 this.restoreInventory=hideInventoryContent(parent,this.host!,origin);
 const host=this.host!,nav=route.querySelector<HTMLElement>('sl-tab-bar')??document.querySelector<HTMLElement>('sl-tab-bar'),measure=()=>{const navBottom=nav?.getBoundingClientRect().bottom;host.style.setProperty('--po-inventory-top',`${Math.max(0,navBottom??host.getBoundingClientRect().top)}px`);};
 measure();document.body.append(host);host.style.removeProperty('visibility');window.addEventListener('resize',measure,{passive:true});window.addEventListener('scroll',measure,{passive:true,capture:true});window.visualViewport?.addEventListener('resize',measure,{passive:true});
 const viewportObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(measure):null;viewportObserver?.observe(parent);if(nav)viewportObserver?.observe(nav);const frame=requestAnimationFrame(measure);
 this.inventoryViewportCleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.visualViewport?.removeEventListener('resize',measure);viewportObserver?.disconnect();};
 const state=this.state(),entries:CollectionEntry[]=state&&scope?state.collection.filter(item=>item.scope===scope).sort((a,b)=>b.openedAt-a.openedAt||a.key.localeCompare(b.key)):[];
 this.root!.render(<CollectionView entries={entries} verified={verified} onGoGrades={onGoGrades}/>);return true;
 }
 updateInventory(scope:string|null,verified:boolean,onGoGrades:()=>void){if(!this.inventoryActive||!this.root)return;const state=this.state(),entries:CollectionEntry[]=state&&scope?state.collection.filter(item=>item.scope===scope).sort((a,b)=>b.openedAt-a.openedAt||a.key.localeCompare(b.key)):[];this.root.render(<CollectionView entries={entries} verified={verified} onGoGrades={onGoGrades}/>);}
 close(){if(this.host)debug('opening.closed');this.collectionMode=false;this.root?.unmount();this.inventoryViewportCleanup?.();this.inventoryViewportCleanup=null;this.restoreInventory?.();this.restoreInventory=null;this.host?.remove();this.host=null;this.root=null;this.audio.stop();this.inerted.forEach(({node,value})=>node.inert=value);if(this.inerted.length)document.documentElement.style.overflow=this.scroll;this.inerted=[];
 let target=this.origin?.isConnected?this.origin:null;
 if(!target&&this.originKey)target=document.querySelector<HTMLElement>(`[data-po-key="${this.originKey}"]`);
 if(target?.isConnected)target.focus({preventScroll:true});else document.querySelector<HTMLButtonElement>('.po-open,.po-inventory-tab')?.focus();this.origin=null;this.originKey=null;
 }
 dispose(){this.close();this.audio.dispose();}
}
