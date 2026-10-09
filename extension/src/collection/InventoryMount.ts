const SHELL='sl-tab-bar,header,nav,[role="banner"],[role="navigation"],[role="tablist"]';
const SURFACES='sl-laatsteresultaten,sl-cijfer-overzicht,sl-vakresultaten';

function containsShell(node:HTMLElement,origin:HTMLElement){
 return node.matches(SHELL)||!!node.querySelector(SHELL)||node.contains(origin);
}

/** Keep the Angular route and its navigation in place; use only its content slot. */
export function inventoryParent(route:HTMLElement,origin:HTMLElement):HTMLElement{
 let content=route.querySelector<HTMLElement>(SURFACES);
 if(!content)return route;
 while(content.parentElement&&content.parentElement!==route&&!containsShell(content.parentElement,origin))content=content.parentElement;
 // Retain a nested native content wrapper (including its grid/flex placement),
 // rather than adding a new sibling that could occupy a header's layout slot.
 return content.parentElement===route&&content.matches(SURFACES)?route:content;
}

export function hideInventoryContent(parent:HTMLElement,host:HTMLElement,origin:HTMLElement){
 const snapshots=new Map<HTMLElement,{hidden:boolean;inert:boolean;aria:string|null;display:string;priority:string}>();
 const hide=(node:HTMLElement)=>{
  if(node===host||node.contains(host)||['STYLE','SCRIPT','LINK','ROUTER-OUTLET'].includes(node.tagName))return;
  if(node.matches(SHELL)||node===origin)return;
  if(node.querySelector(SHELL)||node.contains(origin)){for(const child of node.children)if(child instanceof HTMLElement)hide(child);return;}
  if(snapshots.has(node))return;
  snapshots.set(node,{hidden:node.hidden,inert:node.inert,aria:node.getAttribute('aria-hidden'),display:node.style.getPropertyValue('display'),priority:node.style.getPropertyPriority('display')});
  node.hidden=true;node.inert=true;node.setAttribute('aria-hidden','true');node.style.setProperty('display','none','important');
 };
 const sync=()=>{for(const child of parent.children)if(child instanceof HTMLElement)hide(child);};
 sync();
 // Angular may populate/replace the grade content after the inventory was opened.
 const observer=new MutationObserver(sync);observer.observe(parent,{childList:true,subtree:true});
 return ()=>{
  observer.disconnect();
  for(const [node,snapshot] of snapshots){
   node.hidden=snapshot.hidden;node.inert=snapshot.inert;
   if(snapshot.aria===null)node.removeAttribute('aria-hidden');else node.setAttribute('aria-hidden',snapshot.aria);
   if(snapshot.display)node.style.setProperty('display',snapshot.display,snapshot.priority);else node.style.removeProperty('display');
  }
 };
}
