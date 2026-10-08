import type {Family, Surface} from '../../shared/results/types';
export interface Resource { family: Family; surface: Surface; scopeInput: string | null; }
const segment = '[A-Za-z0-9_-]+';
const rules: [RegExp, Surface, Family, number | null][] = [
 [new RegExp(`^/rest/v1/geldendvoortgangsdossierresultaten/leerling/(${segment})$`),'recent','progression',1],
 [new RegExp(`^/rest/v1/geldendexamendossierresultaten/leerling/(${segment})$`),'recent','exam',1],
 [new RegExp(`^/rest/v1/geldend(voortgangs|examen)dossierresultaten/leerling/cijferoverzicht/(${segment})$`),'overview','progression',2],
 [new RegExp(`^/rest/v1/geldend(voortgangs|examen)dossierresultaten/vakresultaten/(${segment})/vak/${segment}/lichting/${segment}$`),'subject','progression',2],
 [new RegExp(`^/rest/v1/vakkeuzes/plaatsing/${segment}/vakgemiddelden$`),'averages','progression',null],
 [new RegExp(`^/rest/v1/geldendexamendossierresultaten/leerling/context/${segment}$`),'exam-context','exam',null],
 [new RegExp(`^/rest/v1/resultaatpublicatiemomenten/volgende/leerling/${segment}$`),'publication','progression',null],
];
export function matchResource(input: string, origin: string): Resource | null {
 try { const url = new URL(input,origin);
 const knownApi=origin==='https://leerling.somtoday.nl'&&url.origin==='https://api.somtoday.nl';
 if((url.origin!==origin&&!knownApi) || url.username || url.password) return null;
 const path=url.pathname.replace(/\/$/,'');
 for(const [pattern,surface,family,index] of rules){const m=path.match(pattern); if(m) return {surface,family:(surface==='subject'||surface==='overview')&&m[1]==='examen'?'exam':family,scopeInput:index===null?null:m[index]};}
 }catch{/* unknown URL */} return null;
}
