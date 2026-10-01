import {levelFor,clearGemzRange,type LevelId} from './levels.ts';

export const maxEntryMultiple=(level:LevelId)=>50*5**(level-1);
/** Concave curve anchored at 1× entry = 1× loot and 50× entry = 20× loot. */
export function lootMultiplier(multiple:number){
  if(!Number.isSafeInteger(multiple)||multiple<1)throw new RangeError('Choose a whole entry multiple.');
  return 1+19*Math.log1p((multiple-1)/12)/Math.log1p(49/12);
}
export function fortuneChanceBps(levelId:LevelId,multiple=1){return levelId===5?Math.floor(25*lootMultiplier(multiple)+1e-8):0;}
export function entryQuote(levelId:LevelId,multiple=1,gemzBonusBps=0){
  const level=levelFor(levelId),max=maxEntryMultiple(level.id);
  if(!Number.isSafeInteger(multiple)||multiple<1||multiple>max)throw new RangeError(`Choose an entry from 1× to ${max.toLocaleString('en-US')}×.`);
  if(![0,2500].includes(gemzBonusBps))throw new RangeError('Invalid GEMZ equipment bonus.');
  const gemzFactor=1+gemzBonusBps/10000;
  const boost=lootMultiplier(multiple),expectedWeapons=.05*boost;
  const guaranteedWeapons=Math.floor(expectedWeapons+1e-10);
  const extraWeaponBps=Math.max(0,Math.floor((expectedWeapons-guaranteedWeapons)*10000+1e-8));
  const range=clearGemzRange(level);
  return {multiple,max,costRF:level.entryRF*multiple,gemz:level.gemz*multiple*gemzFactor,gemzBonusBps,
    minGemz:range.min*multiple*gemzFactor,maxGemz:range.max*multiple*gemzFactor,boost,guaranteedWeapons,extraWeaponBps};
}
export function weaponRewardLabel(quote:ReturnType<typeof entryQuote>){
  const chance=`${Number((quote.extraWeaponBps/100).toFixed(2))}%`;
  return quote.guaranteedWeapons?`${quote.guaranteedWeapons} guaranteed weapon${quote.guaranteedWeapons===1?'':'s'}${quote.extraWeaponBps?` + ${chance} for another`:''}`:`${chance} weapon chance`;
}
