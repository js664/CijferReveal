// MAIN-world entry point: toggles diagnostics only, never exposes extension data.
const toggleDebug=(enabled:boolean)=>window.postMessage({protocol:'po/magister-debug-toggle',enabled},location.origin);
Object.defineProperty(window,'enable-magister-debug',{configurable:true,value:()=>toggleDebug(true)});
Object.defineProperty(window,'disable-magister-debug',{configurable:true,value:()=>toggleDebug(false)});
