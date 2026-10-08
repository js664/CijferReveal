/** Compare stable x.y.z versions without accepting arbitrary release text. */
export function compareStableVersions(current:string,latest:string):number|null{
 const parse=(value:string)=>{
  const match=/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(value.trim());
  return match?match.slice(1).map(Number):null;
 };
 const a=parse(current),b=parse(latest);if(!a||!b)return null;
 for(let i=0;i<3;i++)if(a[i]!==b[i])return a[i]<b[i]?-1:1;
 return 0;
}
