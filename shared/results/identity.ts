import type {ResultRecord} from './types';
export function recordIdentityKey(record:ResultRecord):string{return JSON.stringify([record.family,record.id,record.variant??null]);}
export async function digest(salt:string,...parts:string[]):Promise<string>{
 const bytes=new TextEncoder().encode(JSON.stringify([salt,...parts]));
 return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
}
