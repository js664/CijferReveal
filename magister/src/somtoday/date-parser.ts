/** Mirror SOMtoday's Ot()/nc() grade-date parsing, not absolute timestamps. */
export function parseSomtodayDate(value:string):Date{
 // SOMtoday strips a positive offset or trailing Z and displays the remaining
 // wall-clock date locally. Honouring the offset shifts midnight to the
 // previous day on UTC/US laptops and prevents an otherwise exact card join.
 const positiveOffset=value.indexOf('+');
 const local=positiveOffset>=0?value.slice(0,positiveOffset):value.endsWith('Z')?value.slice(0,-1):value;
 return new Date(local);
}
