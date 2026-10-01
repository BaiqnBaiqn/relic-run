import {SOULBOUND_COLLECTIONS} from './soulbound.ts';
import {EXPEDITION_CONCEPTS} from './expeditions.ts';
export type LevelId=1|2|3|4|5;
export type Level={id:LevelId;name:string;boss:string;entryRF:number;gemz:number;monsterGemz:number;bossGemz:number;minions:number;roomMinions:number;bossHP:number;hpScale:number;damage:number;color:'meadow'|'pond'|'lilac'|'coral'|'sun';gear:string;potions:string;hint:string;summon:string;minionNames:readonly string[];weapons:readonly string[];jackpot:string;weaponIds:readonly number[];jackpotWeapon:number};
const base:Level={id:1,name:'The Overgrowth',boss:'Hollow Warden',entryRF:100,gemz:100,monsterGemz:3,bossGemz:67,minions:11,roomMinions:9,bossHP:650,hpScale:1.65,damage:5,color:'meadow',gear:'Starter–T1',potions:'Minor (+5)',hint:'Dodge the thorn rings. Step out of his charge.',summon:'BREAK THE ROOT SHIELD',minionNames:['Mossling','Briar Spitter','Barkguard'],weapons:SOULBOUND_COLLECTIONS[0].items.map(g=>g.name),jackpot:'Heartwood scepter',weaponIds:SOULBOUND_COLLECTIONS[0].items.map(g=>g.id),jackpotWeapon:104};
export const LEVELS:readonly Level[]=[base,...EXPEDITION_CONCEPTS.map((c,i):Level=>({
  id:c.level,name:c.name,boss:c.boss,entryRF:c.entryRF,gemz:c.gemz,color:c.color,gear:c.gear,potions:c.potions,
  monsterGemz:[6,14,32,70][i],bossGemz:[164,366,808,1790][i],minions:11,roomMinions:9,
  bossHP:[1900,3800,6500,10000][i],hpScale:[5,9,15,23][i],damage:[44,48,72,105][i],
  hint:['Cross the marked gap in each tide. Attack while the shell rests.','Bait the beam, then leave its locked line. Close in during recovery.','Leave the marked hot plot. The crossing lanes stay open.','Read tides, locked beams and falling stars. Punish each recovery.'][i],
  summon:['BREAK THE SHELL GUARD','BREAK THE PRISM GUARD','QUENCH THE EMBER GUARD','BREAK THE ORBIT GUARD'][i],
  minionNames:[['Reed Skipper','Bubble Spitter','Shellback'],['Shardling','Lens Wisp','Geode Guard'],['Coal Mite','Cinder Sower','Bellows Guard'],['Comet Sprite','Orbit Wisp','Crown Guard']][i],
  weapons:SOULBOUND_COLLECTIONS[i+1].items.map(g=>g.name),jackpot:c.jackpot.split(' · ')[0],weaponIds:SOULBOUND_COLLECTIONS[i+1].items.map(g=>g.id),jackpotWeapon:114+i*10,
}))];
export function levelFor(id:number):Level{const level=LEVELS.find(l=>l.id===id);if(!level)throw new RangeError('Unknown expedition.');return level;}

// Minions pay as they fall; the boss adds a separately rolled bonus. The full
// clear ranges stay centered on the original reward progression. Symmetric roll pairs have an exact mean equal to the base reward.
export function clearGemzRange(level:Level){const spread=Math.floor(level.gemz*.2);return {min:level.gemz-spread,max:level.gemz+spread};}
export function gemzDrop(level:Level,boss:boolean,roll:number){
  if(!Number.isInteger(roll)||roll<0||roll>=10000)throw new RangeError('GEMZ roll must be 0–9999.');
  return boss?level.bossGemz+Math.round((roll-4999.5)*Math.floor(level.gemz*.2)/4999.5):level.monsterGemz;
}
export function gemzRangeLabel(level:Level){const {min,max}=clearGemzRange(level);return `${min}–${max}`;}
