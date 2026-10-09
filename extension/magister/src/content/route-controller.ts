export function listenRoutes(reconcile:()=>void){
 const run=()=>queueMicrotask(reconcile);
 window.addEventListener('popstate',run);window.addEventListener('hashchange',run);
 const nav=(window as unknown as {navigation?:EventTarget}).navigation;
 nav?.addEventListener('navigatesuccess',run);
 // No History patch is needed in isolated world: root mutations detect cached SPA route changes.
 return ()=>{window.removeEventListener('popstate',run);window.removeEventListener('hashchange',run);nav?.removeEventListener('navigatesuccess',run);};
}
