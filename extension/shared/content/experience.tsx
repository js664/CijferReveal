import {debug} from '../diagnostics';
import {createRoot,type Root} from 'react-dom/client';
import {OpeningOverlay} from '../opening/OpeningOverlay';
import {OpeningAudio} from '../opening/audio';
import type {DisplayResult} from '../results/types';
import type {State} from '../state/schema';
import {command} from '../state/repository';
import {queue} from '../state/classifier';
import uiCSS from '../ui.css?inline';
export interface ExperienceOptions {brand?:string;preloadAudio?:boolean;visibleResults?:()=>Set<string>;keepInteractive?:(node:HTMLElement)=>boolean;focusFallback?:()=>HTMLElement|null;}
export class Experience {
 protected host:HTMLElement|null=null;protected root:Root|null=null;protected origin:HTMLElement|null=null;protected collectionMode=false;
 private originKey:string|null=null;private inerted:{node:HTMLElement;value:boolean}[]=[];private scroll='';
 readonly audio=new OpeningAudio(name=>chrome.runtime.getURL(`assets/${name}`));
 constructor(protected state:()=>State|null,protected changed:()=>Promise<void>,private options:ExperienceOptions={}){if(options.preloadAudio!==false)void this.audio.prepare();}
 get active(){if(this.host&&!this.host.isConnected){this.close();return false;}return !!this.host;}
 get collectionActive(){return this.active&&this.collectionMode;}
 get inventoryActive(){return this.active&&this.collectionMode;}
 protected create(parent:HTMLElement=document.body,inventory=false){
 this.host=document.createElement('div');this.host.className=`po-experience-host${inventory?' po-inventory-host':''}`;if(inventory)this.host.style.visibility='hidden';parent.append(this.host);const shadow=this.host.attachShadow({mode:'closed'});const style=document.createElement('style');style.textContent=uiCSS;shadow.append(style);const mount=document.createElement('div');shadow.append(mount);this.root=createRoot(mount);
 }
 open(result:DisplayResult,origin:HTMLElement,scope:string){if(this.active){debug('opening.busy',{},'warn');return;}debug('opening.requested');void this.audio.prepare();this.origin=origin;this.originKey=origin.closest<HTMLElement>('.po-safe-native')?.dataset.poKey??null;this.create();
 this.inerted=[...document.body.children].filter(n=>n!==this.host&&n instanceof HTMLElement&&!this.options.keepInteractive?.(n as HTMLElement)).map(n=>({node:n as HTMLElement,value:(n as HTMLElement).inert}));this.inerted.forEach(({node})=>node.inert=true);this.scroll=document.documentElement.style.overflow;document.documentElement.style.overflow='hidden';
 const s=this.state();if(!s){this.close();return;}
 const visibleKeys=this.options.visibleResults?.()??new Set([...document.querySelectorAll<HTMLElement>('.po-safe-native.po-pending[data-po-key]')].map(card=>card.dataset.poKey));
 const replay=s.records[result.key]?.state==='opened';const rest=queue(s,scope).filter(r=>r.key!==result.key&&visibleKeys.has(r.key)).map(r=>r.display!);const results=[{display:result,replay},...rest.map(display=>({display,replay:false}))];let index=0;
 const settings={...s.settings};
 const commit=async(r:DisplayResult)=>{await command({kind:'open',key:r.key,version:r.version,scope,generation:s.resetGeneration});window.setTimeout(()=>{void this.changed().catch(()=>{/* The durable open succeeded; refresh native grade data after the reveal. */});},150);};
 const cancel=async(r:DisplayResult)=>{await command({kind:'cancel-open',key:r.key,version:r.version,scope,generation:s.resetGeneration});await this.changed();};
 const render=()=>{const current=results[index];this.root!.render(<OpeningOverlay brand={this.options.brand} key={`${current.display.key}:${index}`} result={current.display} replay={current.replay} settings={settings} audio={this.audio} commit={commit} cancel={cancel} close={()=>this.close()} next={index<results.length-1?()=>{index++;render();}:undefined} position={index+1} total={results.length}/>);};render();
 }
 protected cleanupInventory(){}
 close(){if(this.host)debug('opening.closed');this.collectionMode=false;this.root?.unmount();this.cleanupInventory();this.host?.remove();this.host=null;this.root=null;this.audio.stop();this.inerted.forEach(({node,value})=>node.inert=value);if(this.inerted.length)document.documentElement.style.overflow=this.scroll;this.inerted=[];
 let target=this.origin?.isConnected?this.origin:null;
 if(!target&&this.originKey)target=document.querySelector<HTMLElement>(`[data-po-key="${this.originKey}"]`);
 if(target?.isConnected)target.focus({preventScroll:true});else (this.options.focusFallback?.()??document.querySelector<HTMLButtonElement>('.po-open'))?.focus();this.origin=null;this.originKey=null;
 }
 dispose(){this.close();this.audio.dispose();}
}
