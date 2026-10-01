export const CHEST_ROLL_SIZE=1_000_000;
export type ChestId='overgrowth'|'tidebound'|'prismatic'|'astral';
export type ChestOdds={tier:number;chancePpm:number};
export type Chest={id:ChestId;name:string;cost:number;floor:number;color:string;description:string;odds:readonly ChestOdds[]};
export const CHESTS:readonly Chest[]=[
  {id:'overgrowth',name:'Overgrowth chest',cost:250,floor:1,color:'#B9D984',description:'A humble chest with the occasional hidden treasure.',odds:[{tier:1,chancePpm:950000},{tier:2,chancePpm:40000},{tier:3,chancePpm:8000},{tier:4,chancePpm:1905},{tier:5,chancePpm:95}]},
  {id:'tidebound',name:'Tidebound chest',cost:2500,floor:2,color:'#7DB4DB',description:'Mostly T2. A good shot at T3; rare T4 and T5 finds.',odds:[{tier:2,chancePpm:780000},{tier:3,chancePpm:200000},{tier:4,chancePpm:19050},{tier:5,chancePpm:950}]},
  {id:'prismatic',name:'Prismatic chest',cost:25000,floor:3,color:'#B3A0D8',description:'Mostly T3. A good shot at T4; a rare T5 surprise.',odds:[{tier:3,chancePpm:800000},{tier:4,chancePpm:190500},{tier:5,chancePpm:9500}]},
  {id:'astral',name:'Astral chest',cost:250000,floor:4,color:'#F2CE68',description:'T4 or T5 only. An endgame chest for a legendary hunt.',odds:[{tier:4,chancePpm:905000},{tier:5,chancePpm:95000}]},
];
export const BASE_CHEST=CHESTS[0];
export function chestFor(id:string):Chest{const chest=CHESTS.find(c=>c.id===id);if(!chest)throw new Error('Unknown chest.');return chest;}
export function chestTier(id:ChestId,roll:number){
  if(!Number.isInteger(roll)||roll<0||roll>=CHEST_ROLL_SIZE)throw new RangeError('Chest tier roll must be 0–999999.');
  let total=0;return chestFor(id).odds.find(o=>(total+=o.chancePpm)>roll)!.tier;
}
export const chanceLabel=(ppm:number)=>`${Number((ppm/10000).toFixed(4))}%`;
export const gemzLabel=(amount:number)=>new Intl.NumberFormat('en-US').format(amount);
export function expectedTierCost(chest:Chest,tier:number){const p=chest.odds.find(o=>o.tier===tier)?.chancePpm??0;return p?chest.cost*CHEST_ROLL_SIZE/p:Infinity;}
// One T5 has the same expected GEMZ cost in every chest. This target refers to
// acquisition effort, not combat power, an exchange value or a guaranteed drop.
export const T5_T1_COST_RATIO=BASE_CHEST.odds.find(o=>o.tier===1)!.chancePpm/BASE_CHEST.odds.find(o=>o.tier===5)!.chancePpm;
