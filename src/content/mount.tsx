import {Experience as CoreExperience} from '../../shared/content/experience';
import {CollectionView} from '../../shared/collection/CollectionView';
import {inventoryParent,hideInventoryContent} from '../collection/InventoryMount';
import type {CollectionEntry,State} from '../../shared/state/schema';
export class Experience extends CoreExperience {
 private restoreInventory:(()=>void)|null=null;private inventoryViewportCleanup:(()=>void)|null=null;
 constructor(state:()=>State|null,changed:()=>Promise<void>){super(state,changed,{focusFallback:()=>document.querySelector('.po-open,.po-inventory-tab')});}
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

 protected cleanupInventory(){this.inventoryViewportCleanup?.();this.inventoryViewportCleanup=null;this.restoreInventory?.();this.restoreInventory=null;}
}
