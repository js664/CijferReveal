export type DiagnosticLevel='info'|'warn'|'error';
export type DiagnosticSink=(event:string,data:unknown,level:DiagnosticLevel)=>void;
let sink:DiagnosticSink=()=>{};
export function setDiagnosticSink(next:DiagnosticSink){sink=next;}
export function debug(event:string,data:unknown={},level:DiagnosticLevel='info'){try{sink(event,data,level);}catch{/* Diagnostics never interrupt the core. */}}
export function errorData(error:unknown){
 const name=error instanceof Error?error.name:'UnknownError';
 const errorName=['Error','TypeError','RangeError','SyntaxError','AbortError','TimeoutError','SecurityError','NotAllowedError','QuotaExceededError','InvalidStateError'].includes(name)?name:'UnknownError';
 const message=error instanceof Error?error.message:'';
 const issue=/fetch|network/i.test(message)?'network':/context invalidated|receiving end|message port/i.test(message)?'extension-connection':/quota/i.test(message)?'quota':/json/i.test(message)?'json':/abort|timeout/i.test(message)?'timeout':'unspecified';
 return {errorName,issue};
}
