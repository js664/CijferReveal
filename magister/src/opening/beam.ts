// Shared typed properties keep the library's CSS animations smooth inside Shadow DOM.
// Register a bounded pair per document, rather than one pair per opening/card.
let registered=false;
export function registerBeamProperties(){
 if(registered||typeof CSS==='undefined'||!CSS.registerProperty)return;
 for(const property of [{name:'--po-beam-angle',syntax:'<angle>',initialValue:'0deg',inherits:false},{name:'--po-beam-opacity',syntax:'<number>',initialValue:'0',inherits:false}]){
 try{CSS.registerProperty(property);}catch{/* May already be registered by another extension mount. */}
 }
 registered=true;
}
export const BEAM_SHADOW_CSS=`
[data-beam="{id}"] {--beam-angle-{id}:var(--po-beam-angle,0deg);--beam-opacity-{id}:var(--po-beam-opacity,0);}
@keyframes beam-spin-{id} {from{--po-beam-angle:0deg;}to{--po-beam-angle:360deg;}}
@keyframes beam-fade-in-{id} {to{--po-beam-opacity:1;}}
@keyframes beam-fade-out-{id} {from{--po-beam-opacity:1;}to{--po-beam-opacity:0;}}
`;
