// Historical coverage policy for unimplemented derived/baseline features.
// Individual manual pack openings never depend on these validation flags.
export interface ValidationProfile { numericValidated:boolean; selfTypes:string[]; individualColumnTypes:string[]; baselineCoverageValidated:boolean; }
export const LIVE_PROFILE:ValidationProfile={numericValidated:false,selfTypes:[],individualColumnTypes:[],baselineCoverageValidated:false};
export function individualValidated(record:{selfType:string;columnType?:string;aggregate:boolean},profile:ValidationProfile):boolean{
 return profile.numericValidated&&!record.aggregate&&profile.selfTypes.includes(record.selfType)&&!!record.columnType&&profile.individualColumnTypes.includes(record.columnType);
}
