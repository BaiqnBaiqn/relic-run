export const STATS=['health','attack','speed','dexterity'] as const;
export type Stat=typeof STATS[number];
export type StatPoints=Record<Stat,number>;
export type PotionId=`${'minor'|'major'}:${Stat}`;
export const EMPTY_POINTS:StatPoints={health:0,attack:0,speed:0,dexterity:0};
// Twenty drinks per stat per life; majors still provide twice the benefit.
export const POTION_CAP=20,STAT_CAP=POTION_CAP*2;
export function potionDrinks(c:{points:StatPoints;drinks?:StatPoints}):StatPoints{return c.drinks??{...c.points};}
export function potionEffect(stat:Stat,points:number){return stat==='health'?`+${points*5} max HP`:stat==='attack'?`+${points*5}% damage`:stat==='speed'?`+${points*5} movement speed`:`+${points*5}% attack rate`;}
export const POTIONS=STATS.flatMap(stat=>(['minor','major'] as const).map(size=>({id:`${size}:${stat}` as PotionId,stat,size,points:size==='minor'?1:2})));
export const potionName=(id:PotionId)=>id.split(':').map(s=>s[0].toUpperCase()+s.slice(1)).join(' ')+' potion';
export function potionForLevel(level:number,sizeRoll:number,statRoll:number):PotionId{
  if(!Number.isInteger(level)||level<1||level>5)throw new Error('Unknown potion level.');
  if([sizeRoll,statRoll].some(r=>!Number.isInteger(r)||r<0||r>=10000))throw new Error('Invalid potion roll.');
  const size=level<=2?'minor':level===5?'major':sizeRoll<5000?'minor':'major';
  return `${size}:${STATS[Math.floor(statRoll/2500)]}`;
}
