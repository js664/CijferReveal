import type {CollectionEntry} from '../state/schema';
import {tierFor} from '../opening/tiers';

export type InventorySort='newest'|'oldest'|'highest'|'lowest';
export interface InventoryFilters {query:string;subject:string;tier:string;sort:InventorySort;}
function normalizeSearch(value:string){return value.toLocaleLowerCase('nl-NL').normalize('NFD').replace(/\p{Diacritic}/gu,'');}
export function filterInventory(entries:CollectionEntry[],filters:InventoryFilters){
 const query=normalizeSearch(filters.query.trim());
 const filtered=entries.filter(entry=>{
  const tier=tierFor(entry.grade).name;
  return (!filters.subject||entry.subject===filters.subject)&&(!filters.tier||tier===filters.tier)&&(!query||normalizeSearch(`${entry.subject} ${entry.description} ${entry.value}`).includes(query));
 });
 return filtered.sort((a,b)=>{
  if(filters.sort==='newest')return b.openedAt-a.openedAt||a.key.localeCompare(b.key);
  if(filters.sort==='oldest')return a.openedAt-b.openedAt||a.key.localeCompare(b.key);
  const left=a.grade,right=b.grade;if(left===null&&right!==null)return 1;if(right===null&&left!==null)return -1;
  return (filters.sort==='highest'?-1:1)*((left??0)-(right??0))||b.openedAt-a.openedAt;
 });
}
export function inventoryStats(entries:CollectionEntry[]){
 const numeric=entries.flatMap(entry=>entry.grade===null?[]:[entry.grade]);
 return {total:entries.length,average:numeric.length?numeric.reduce((sum,value)=>sum+value,0)/numeric.length:null,highest:numeric.length?numeric.reduce((highest,value)=>Math.max(highest,value),-Infinity):null};
}
export function inventorySubjects(entries:CollectionEntry[]){return [...new Set(entries.map(entry=>entry.subject).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'nl-NL'));}
export function tierLabel(name:string){return ({crimson:'Lager dan 5,5',bronze:'5,5–6,4',steel:'6,5–7,4',gold:'7,5–8,4',electric:'8,5–9,4',iridescent:'9,5 en hoger',neutral:'Letter/teken of *'} as Record<string,string>)[name]??name;}
