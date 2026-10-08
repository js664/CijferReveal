export function sanitizeClone(root:HTMLElement){
 for(const node of [root,...root.querySelectorAll<HTMLElement>('*')]){
 for(const name of [...node.attributes].map(a=>a.name))if(name!=='class')node.removeAttribute(name);
 }
}
export function excludeNative(owner:HTMLElement){
 if(owner.getAttribute('aria-hidden')!=='true')owner.setAttribute('aria-hidden','true');if(!owner.inert)owner.inert=true;
 // CSS excludes the owner before these asynchronous defensive changes.
 for(const node of [owner,...owner.querySelectorAll<HTMLElement>('[aria-label],[title],[aria-describedby],[aria-labelledby]')]){
 for(const attribute of ['aria-label','title','aria-describedby','aria-labelledby'])node.removeAttribute(attribute);
 }
}
