import type {State,Settings} from './schema';
import type {ClassifiedInput} from './classifier';
import type {Surface} from '../somtoday/types';
export type Command={kind:'read'}|{kind:'observe';inputs:ClassifiedInput[];scope:string|null;surface:Surface}|{kind:'open'|'cancel-open';key:string;version:string;scope:string;generation:number}|{kind:'settings';settings:Settings}|{kind:'clear-collection'}|{kind:'reset'};
export async function command(command:Command):Promise<State>{
 const result=await chrome.runtime.sendMessage({protocol:'po/storage',command});
 if(!result?.ok)throw new Error(result?.error??'Opslaan niet gelukt. Opnieuw proberen.');return result.state;
}
