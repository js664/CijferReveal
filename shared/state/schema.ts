import type {DisplayResult} from '../results/types';
export type Lifecycle='observed-nonnumeric'|'baseline'|'pending'|'opened'|'unresolved';
export interface StoredResult { key:string;scope:string;version:string;state:Lifecycle;numeric:boolean;firstSeen:number;lastResolvedState?:Lifecycle;display?:DisplayResult; }
export interface Settings { sound:boolean;volume:number;motion:'system'|'reduce'; }
export interface CollectionEntry extends DisplayResult { openedAt:number;scope:string; }
export interface StoredAlias {scope:string;family:'progression'|'exam';rawVersion:string;proof?:string;signature:string;logicalKey:string;numeric:boolean;firstSeen:number;display?:DisplayResult;openedSignature?:string;}
export interface State { schema:2;salt:string;resetGeneration:number;aliases:Record<string,StoredAlias>;records:Record<string,StoredResult>;coverage:Record<string,{overview:boolean;subject:boolean;armed:boolean}>;collection:CollectionEntry[];settings:Settings; }
export const defaultSettings:Settings={sound:true,volume:.7,motion:'system'};
export function newState():State {return {schema:2,salt:Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''),resetGeneration:0,aliases:{},records:{},coverage:{},collection:[],settings:{...defaultSettings}};}
