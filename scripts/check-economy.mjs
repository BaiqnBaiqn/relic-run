import {FORTUNE_FANG} from '../games/relic-run/gear.ts';
import {fortuneChanceBps} from '../games/relic-run/entry.ts';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {LEVEL_ONE,CHEST_ODDS,CHEST_COST,RF,createEconomy,beginEntry} from '../games/relic-run/economy.ts';
import {LEVELS,clearGemzRange} from '../games/relic-run/levels.ts';
import {maxEntryMultiple,entryQuote} from '../games/relic-run/entry.ts';
import {POTION_CAP} from '../games/relic-run/potions.ts';
import {CHESTS,CHEST_ROLL_SIZE,T5_T1_COST_RATIO} from '../games/relic-run/chests.ts';
const config=JSON.parse(await readFile(new URL('../games/relic-run/economy.json',import.meta.url),'utf8'));
assert.equal(config.entryRF*RF,LEVEL_ONE.entry);
assert.equal(config.chest.costGemz,CHEST_COST);
assert.deepEqual(config.chest.tiers,CHEST_ODDS);
assert.deepEqual(config.chests,CHESTS);assert.equal(config.chest.rollSize,CHEST_ROLL_SIZE);assert.equal(config.t5ExpectedGemzCostVsT1,T5_T1_COST_RATIO);
assert.equal(config.jackpot.chanceBps,LEVEL_ONE.jackpotChanceBps);
const e=createEconomy(0);beginEntry(e,'check','generation:1',1);
assert.deepEqual([e.pool.rf,e.jackpots[1],e.ecosystem],config.allocationBps.map(bps=>LEVEL_ONE.entry*bps/10000));
assert.equal(LEVEL_ONE.monsterGemz*LEVEL_ONE.minions+LEVEL_ONE.bossGemz,100);
assert.equal(config.jackpot.winnerBps,8000);
assert.equal(config.levels.length,5);
for(const level of LEVELS){
  const configLevel=config.levels.find(l=>l.id===level.id);
  const range=clearGemzRange(level);assert.deepEqual(configLevel.fullClearGemzRange,[range.min,range.max]);assert.equal(configLevel.fullClearGemzMeaning,'mean');
  assert.equal(configLevel.entryRF,level.entryRF);assert.equal(configLevel.bossHP,level.bossHP);assert.equal(configLevel.maxEntryMultiple,maxEntryMultiple(level.id));assert.equal(configLevel.fullClearGemz,level.gemz);
  assert.equal(level.minions*level.monsterGemz+level.bossGemz,level.gemz);
  assert.equal(configLevel.jackpotWeapon,level.jackpotWeapon);assert.deepEqual(configLevel.weapons,level.weaponIds);
}
assert.equal(config.gemz.kind,'internal-game-currency');assert.equal(config.gemz.transferable,false);
console.log('Valid: five level reward tables, 80/15/5 split, one global pool, independent 0.25% jackpots, four chests and 10000× T5 acquisition cost.');

assert.equal(config.potions.drinksPerStat,POTION_CAP);assert.equal(entryQuote(1,50).boost,20);

assert.equal(config.fortuneFang.id,FORTUNE_FANG.id);assert.equal(config.fortuneFang.gemzBonusBps,FORTUNE_FANG.gemzBonusBps);assert.equal(config.fortuneFang.baseChanceBps,fortuneChanceBps(5));assert.equal(fortuneChanceBps(5,50),500);assert.deepEqual(config.entryBoost.weaponWeightsBps,[2500,2500,2500,2500]);
