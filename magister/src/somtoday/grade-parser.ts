export const PARSER_VERSION = 3;
/** Canonical comparison form for SOMtoday's numeric and textual grade values. */
export function normalizeGradeValue(value: unknown): string | null {
 if(typeof value!=='string')return null;
 const normalized=value.normalize('NFKC').replace(/\s+/gu,' ').trim();
 return normalized?normalized:null;
}
export function parseGrade(value: unknown): number | null {
 // Accept whole numeric values in both decimal notations; never parse labels,
 // percentages, signs or trailing text as grades.
 const text=normalizeGradeValue(value);if(!text||!/^(?:[1-9](?:[,.][0-9]{1,2})?|10(?:[,.]0{1,2})?)$/.test(text))return null;
 const grade=Number(text.replace(',','.'));return grade>=1&&grade<=10?grade:null;
}
