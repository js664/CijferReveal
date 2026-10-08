export interface ResultFamily {
 readonly id:string;
 readonly values:readonly string[];
}

/** Add recognized ordered non-numeric result systems here. */
export const resultFamilies:readonly ResultFamily[]=Object.freeze([
 Object.freeze({id:'assessment',values:Object.freeze(['O','V','G','ZG'])}),
 Object.freeze({id:'level',values:Object.freeze(['BB','KB','TL','HV','A'])}),
 Object.freeze({id:'assessment-five-step',values:Object.freeze(['O','M','V','RV','G'])})
]);

/** Only normalize for lookup. The caller keeps and reveals the original value. */
const lookupValue=(value:string)=>value.trim().toLocaleUpperCase('nl-NL');
export function resultFamilyFor(value:string):ResultFamily|undefined{
 const normalized=lookupValue(value);
 if(!normalized)return undefined;
 const matches=resultFamilies.filter(family=>family.values.includes(normalized));
 // A shared label does not identify its grading scale. Keep the reel generic
 // until the source gives us a reliable scale discriminator.
 return matches.length===1?matches[0]:undefined;
}

/**
 * Build family-only decoys. The last five approach the target's rank while
 * distant cards avoid showing it early; the target tile itself remains owned
 * by SOMtoday's actual result in MysteryReel.
 */
export function familyReelValues(family:ResultFamily,value:string,length:number,targetIndex:number,random:()=>number):readonly string[]{
 const target=lookupValue(value),targetRank=family.values.indexOf(target);
 if(targetRank<0)throw new Error('Result does not belong to this family.');
 const distant=family.values.filter(candidate=>candidate!==target),grades:string[]=[];
 const anticipationStart=Math.max(0,targetRank-2);
 for(let index=0;index<length;index++){
  if(index<targetIndex-5){grades.push(distant[Math.min(distant.length-1,Math.floor(random()*distant.length))]);continue;}
  const step=index-(targetIndex-5);
  if(targetRank===0)grades.push(step===0?family.values[1]:family.values[0]);
  else grades.push(family.values[Math.min(targetRank,anticipationStart+Math.floor((step+1)/2))]);
 }
 // Small variations keep the approach from repeating exactly on every open.
 if(targetRank>0&&targetIndex>=5&&random()<.5){const first=targetIndex-5;[grades[first],grades[first+1]]=[grades[first+1],grades[first]];}
 return Object.freeze(grades);
}
