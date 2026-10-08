import {expect,it} from 'vitest';
import {familyReelValues,resultFamilies,resultFamilyFor} from '../src/opening/result-families';
const seeded=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
it.each(['O','V','G'])('does not guess which overlapping assessment scale owns %s',value=>expect(resultFamilyFor(value)).toBeUndefined());
it('recognizes the unique O/V/G/ZG assessment value',()=>expect(resultFamilyFor('ZG')?.id).toBe('assessment'));
it.each(['BB','KB','TL','HV','A'])('recognizes level value %s',value=>expect(resultFamilyFor(value)?.id).toBe('level'));
it.each(['M','RV'])('recognizes the unique five-step assessment value %s',value=>expect(resultFamilyFor(value)?.id).toBe('assessment-five-step'));
it.each(['EX','N3','GOED+','🧪',''])('does not guess a family for %s',value=>expect(resultFamilyFor(value)).toBeUndefined());
it.each([[' g ',undefined],['zg','assessment'],[' rv ','assessment-five-step'],[' hv ','level'],['bb','level']] as const)('normalizes only surrounding whitespace and casing for %j', (value,family)=>expect(resultFamilyFor(value)?.id).toBe(family));
it('keeps family registries separate and immutable',()=>{
 expect(resultFamilies.map(family=>family.id)).toEqual(['assessment','level','assessment-five-step']);
 expect(resultFamilies[0].values).toEqual(['O','V','G','ZG']);expect(resultFamilies[1].values).toEqual(['BB','KB','TL','HV','A']);
 expect(resultFamilies[2].values).toEqual(['O','M','V','RV','G']);expect(resultFamilies[0].values).not.toContain('KB');expect(resultFamilies[1].values).not.toContain('G');
 expect(Object.isFrozen(resultFamilies)).toBe(true);expect(resultFamilies.every(family=>Object.isFrozen(family.values))).toBe(true);
});
it('generates decoys exclusively from the selected family and rejects mismatched targets',()=>{
 for(const family of resultFamilies){const result=family.values.at(-1)!,entries=familyReelValues(family,result,45,35,seeded(11));expect(entries).toHaveLength(45);expect(entries.every(value=>family.values.includes(value))).toBe(true);}
 expect(()=>familyReelValues(resultFamilies[0],'HV',45,35,seeded(12))).toThrow('Result does not belong to this family.');
});
