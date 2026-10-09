type TabHandler=(origin:HTMLButtonElement)=>void;
type LeaveHandler=(tab:HTMLElement)=>void;
type TabState={aria:string|null;tabindex:string|null;current:string|null;activeClass:boolean};
const controllers=new WeakMap<HTMLElement,{button:HTMLButtonElement;select:TabHandler;leave:LeaveHandler;listener:(event:Event)=>void;buttonListener:(event:Event)=>void;keyListener:(event:KeyboardEvent)=>void;selected:Map<HTMLElement,TabState>;tabs:HTMLElement[]}>();

function labelOf(tab:HTMLElement){return (tab.getAttribute('aria-label')??tab.textContent??'').replace(/\s+/g,' ').trim();}
function findBar(){
 for(const bar of document.querySelectorAll<HTMLElement>('sl-tab-bar')){
  const tabs=[...bar.querySelectorAll<HTMLElement>('sl-tab,[role="tab"]')];
  if(tabs.some(tab=>/^cijfers\b/i.test(labelOf(tab))))return {bar,tabs};
 }
 return null;
}
function isActive(tab:HTMLElement){return tab.getAttribute('aria-selected')==='true'||tab.getAttribute('aria-current')==='page'||tab.classList.contains('active');}

export interface InventoryTabController {button:HTMLButtonElement;setActive(active:boolean):void;remove():void;}
export function injectInventoryTab(select:TabHandler,leave:LeaveHandler):InventoryTabController|null{
 const found=findBar();if(!found)return null;
 let controller=controllers.get(found.bar);
 if(!controller){
  const cijfers=found.tabs.find(tab=>/^cijfers\b/i.test(labelOf(tab)))!;
  const button=document.createElement('button');button.type='button';button.id='po-inventory-tab';button.className='po-inventory-tab';button.setAttribute('role','tab');button.setAttribute('aria-label','Inventaris');button.setAttribute('aria-selected','false');button.setAttribute('aria-controls','po-inventory-page');button.tabIndex=-1;
  button.innerHTML='<span>Inventaris</span>';
  const inactive=found.tabs.find(tab=>tab!==cijfers&&!isActive(tab))??cijfers;
  const copy=['display','align-items','gap','min-height','height','padding','font-family','font-size','font-weight','line-height','letter-spacing','text-transform'];
  const nativeActive=found.tabs.find(isActive)??cijfers;const styles=getComputedStyle(inactive),activeStyle=getComputedStyle(nativeActive);for(const property of copy){const value=styles.getPropertyValue(property);if(value)button.style.setProperty(property,value);}
  const activeIndicator=nativeActive.querySelector<HTMLElement>('.active-border-top');const activeBorder=activeIndicator?getComputedStyle(activeIndicator).backgroundColor:activeStyle.borderTopColor;
  button.style.setProperty('--po-inventory-active-border',activeBorder&&activeBorder!=='rgba(0, 0, 0, 0)'?activeBorder:'#3275c6');button.style.setProperty('--po-inventory-inactive-color',styles.color);button.style.setProperty('--po-inventory-active-color',activeStyle.color);
  cijfers.after(button);
  const snapshots=new Map<HTMLElement,TabState>();
  const listener=(event:Event)=>{
   const target=event.target instanceof Element?event.target:null;
   if(target&&found.bar.contains(target)){const tab=target.closest<HTMLElement>('sl-tab,[role="tab"]');if(tab&&tab!==controller?.button)controller?.leave(tab);}
  };
  // Catch a completed activation before SOMtoday's tab-bar delegates it. Use
  // click (not pointerdown) so pressing and dragging away cannot open the tab.
  const buttonListener=(event:Event)=>{if(event.target instanceof Element&&event.target.closest('.po-inventory-tab')){event.preventDefault();event.stopPropagation();controller?.select(button);}};
  const keyListener=(event:KeyboardEvent)=>{const target=event.target instanceof Element?event.target.closest<HTMLElement>('sl-tab,[role="tab"]'):null;if(!target||!found.bar.contains(target))return;
   if(target===button&&(event.key==='Enter'||event.key===' ')){event.preventDefault();controller?.select(button);return;}
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   const items=controller?.tabs.filter(tab=>tab.isConnected&&!tab.hasAttribute('disabled'))??[];const at=Math.max(0,items.indexOf(target));const next=event.key==='Home'?items[0]:event.key==='End'?items.at(-1):items[(at+(event.key==='ArrowRight'?1:-1)+items.length)%items.length];
   if(next){event.preventDefault();event.stopPropagation();next.focus();next.click();}
  };
  // Bind activation to the injected control itself. Its click handler runs
  // before SOMtoday's tab-bar delegation, so the app never mistakes the
  // custom tab for a native route change.
  button.addEventListener('click',buttonListener);
  document.addEventListener('keydown',keyListener,true);
  found.bar.addEventListener('click',listener,true);
  controller={button,select,leave,listener,buttonListener,keyListener,selected:snapshots,tabs:[...found.bar.querySelectorAll<HTMLElement>('sl-tab,[role="tab"]')]};controllers.set(found.bar,controller);
 }
 controller.select=select;controller.leave=leave;controller.tabs=[...found.bar.querySelectorAll<HTMLElement>('sl-tab,[role="tab"]')];
 if(!controller.button.isConnected){const cijfers=found.tabs.find(tab=>/^cijfers\b/i.test(labelOf(tab)));if(cijfers)cijfers.after(controller.button);}
 return {button:controller.button,setActive(active){
  const c=controller!;
  if(active){
   for(const tab of c.tabs){if(tab===c.button)continue;if(!c.selected.has(tab))c.selected.set(tab,{aria:tab.getAttribute('aria-selected'),tabindex:tab.getAttribute('tabindex'),current:tab.getAttribute('aria-current'),activeClass:tab.classList.contains('active')});if(tab.hasAttribute('aria-selected'))tab.setAttribute('aria-selected','false');if(tab.hasAttribute('tabindex'))tab.tabIndex=-1;if(tab.hasAttribute('aria-current'))tab.removeAttribute('aria-current');tab.classList.remove('active');}
  }
  if(!active&&c.button.hasAttribute('data-active')){
   for(const [tab,attrs] of c.selected){if(!tab.isConnected)continue;if(attrs.aria===null)tab.removeAttribute('aria-selected');else tab.setAttribute('aria-selected',attrs.aria);if(attrs.tabindex===null)tab.removeAttribute('tabindex');else tab.setAttribute('tabindex',attrs.tabindex);if(attrs.current===null)tab.removeAttribute('aria-current');else tab.setAttribute('aria-current',attrs.current);tab.classList.toggle('active',attrs.activeClass);}
   c.selected.clear();
  }
  c.button.toggleAttribute('data-active',active);c.button.setAttribute('aria-selected',String(active));if(active)c.button.setAttribute('aria-current','page');else c.button.removeAttribute('aria-current');c.button.tabIndex=active?0:-1;
 },remove(){controller!.button.removeEventListener('click',controller!.buttonListener);document.removeEventListener('keydown',controller!.keyListener,true);controller?.button.remove();found.bar.removeEventListener('click',controller!.listener,true);controller!.selected.clear();controllers.delete(found.bar);}};
}
