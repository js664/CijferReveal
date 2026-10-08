export {digest,recordIdentityKey} from '../../shared/results/identity';
export function getCanonicalResultIdentity(record: unknown): {id:string;type:string} | null {
 if(!record || typeof record!=='object')return null;
 const r=record as Record<string,unknown>;
 if(!Array.isArray(r.links))return null;
 const self=r.links.filter(l=>l&&typeof l==='object'&&l.rel==='self');
 // SOMtoday's own identity helper falls back to koppeling. Accept that only
 // for the two known individual result types with an exact matching link.
 const individual=r.$type==='resultaten.RGeldendVoortgangsdossierResultaat'||r.$type==='resultaten.RGeldendExamendossierResultaat';
 const links=self.length?self:individual?r.links.filter(l=>l&&typeof l==='object'&&l.rel==='koppeling'&&l.type===r.$type):[];
 if(links.length!==1)return null;
 const l=links[0];
 // SOMtoday's live self links use safe integer IDs; normalize before hashing.
 const id=typeof l.id==='number'&&Number.isSafeInteger(l.id)&&l.id>0?String(l.id):typeof l.id==='string'?l.id:null;
 if(!id||id.length>256||typeof l.type!=='string'||!l.type.startsWith('resultaten.')||l.type.length>160)return null;
 if(r.$type!==undefined && r.$type!==l.type)return null;
 return {id,type:l.type};
}
