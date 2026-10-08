export const tiers=[{name:'crimson',color:'#e98287',particles:12},{name:'bronze',color:'#d8a06d',particles:20},{name:'steel',color:'#c1d4e5',particles:26},{name:'gold',color:'#f1c979',particles:40},{name:'electric',color:'#7cc8ff',particles:64},{name:'iridescent',color:'#be9bff',particles:90}] as const;
const neutralTier={name:'neutral',color:'#c1d4e5',particles:0} as const;
export function tierFor(grade:number|null){return grade===null?neutralTier:tiers[grade<5.5?0:grade<6.5?1:grade<7.5?2:grade<8.5?3:grade<9.5?4:5];}
