import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomy,account,character,beginEntry,creditKill,finishVictory,finishDeath,equip,openChest,revealChest,consumePotion,contribute,settleRound,totalRF,totalContributed,entryAllocation,redemptionPreview,RF,ROUND_MS,LOCKOUT_MS,validateEconomy} from '../games/relic-run/economy.ts';
import {bossLoot,chestLoot,gearFor,EMPTY_LOADOUT,CHEST_GEAR,ITEM_TYPES,SLOTS,TIERS,GEAR} from '../games/relic-run/gear.ts';
import {chestTier,CHEST_ROLL_SIZE} from '../games/relic-run/chests.ts';
import {potionForLevel} from '../games/relic-run/potions.ts';
import {migrateLegacy} from '../games/relic-run/storage.ts';
const scope='guest',key='generation:sample';
const rolls={gemz:5000,weapon:9999,bonusPotion:9999,size:0,stat:0,secondSize:9999,secondStat:9999};
function clear(e,{owner=scope,friend=key,jackpot=9999,weapon=9999,bonusPotion=9999}={}){
  const id=beginEntry(e,owner,friend,1);for(let i=1;i<=11;i++)creditKill(e,owner,id,i,false,rolls);
  creditKill(e,owner,id,12,true,{...rolls,weapon,bonusPotion});finishVictory(e,owner,id,60,jackpot);return id;
}
function mintFixture(e,owner,gemz){account(e,owner).gemz+=gemz;e.gemzMinted+=gemz;}

test('100 RF entry funds one global pool 80%, its jackpot 15%, ecosystem 5%; no immediate RF',()=>{
  const e=createEconomy(0);account(e,scope);const total=totalRF(e);clear(e);
  assert.equal(e.accounts[scope].rf,400*RF);assert.equal(e.pool.rf,80*RF);assert.equal(e.jackpots[1],15*RF);assert.equal(e.ecosystem,5*RF);
  assert.equal(e.accounts[scope].gemz,100);assert.deepEqual(e.accounts[scope].active.items,[]);assert.equal(totalRF(e),total);assert.ok(validateEconomy(e));
});
test('three average clears afford a 250-GEMZ chest, never a soulbound item',()=>{
  const e=createEconomy(0);for(let i=0;i<2;i++)clear(e);
  const before=structuredClone(e);assert.throws(()=>openChest(e,scope,key,0,0,0),/250 GEMZ/);assert.deepEqual(e,before);
  clear(e);const id=openChest(e,scope,key,999999,9999,11);assert.equal(gearFor(id).tier,5);assert.equal(gearFor(id).slot,'ring');assert.ok(!gearFor(id).soulbound);
  assert.equal(e.accounts[scope].gemz,50);assert.equal(e.gemzBurned,250);assert.equal(e.accounts[scope].characters[key].inventory[id],1);assert.ok(validateEconomy(e));
});
test('exact chest tier and independent slot odds; ordinary boss weapons total 5%',()=>{
  const tiers={1:0,2:0,3:0,4:0,5:0},slots={weapon:0,ability:0,armor:0,ring:0},weapons={401:0,402:0,403:0,404:0,null:0};
  for(let roll=0;roll<10000;roll++){slots[gearFor(chestLoot(0,roll,0)).slot]++;weapons[bossLoot(roll)]++;}
  for(let roll=0;roll<CHEST_ROLL_SIZE;roll++)tiers[chestTier('overgrowth',roll)]++;assert.deepEqual(tiers,{1:950000,2:40000,3:8000,4:1905,5:95});assert.deepEqual(slots,{weapon:2500,ability:2500,armor:2500,ring:2500});assert.deepEqual(weapons,{401:125,402:125,403:125,404:125,null:9500});
  assert.throws(()=>chestLoot(-1,0,0));assert.throws(()=>chestLoot(0,0,12));assert.throws(()=>chestLoot(0,0,NaN));assert.throws(()=>bossLoot(10000));
});
test('all 75 chest items are reachable and types within each slot are equally likely',()=>{
  assert.equal(CHEST_GEAR.length,75);assert.equal(new Set(GEAR.map(g=>g.id)).size,GEAR.length);
  for(const type of ITEM_TYPES)assert.deepEqual(CHEST_GEAR.filter(g=>g.itemType===type.type).map(g=>g.tier),[...TIERS]);
  const reached=new Set();
  for(const tierRoll of [0,950000,990000,998000,999905])for(let slot=0;slot<4;slot++){
    const counts={};for(let type=0;type<12;type++){const id=chestLoot(tierRoll,slot*2500,type);reached.add(id);counts[id]=(counts[id]??0)+1;}
    assert.equal(Object.keys(counts).length,ITEM_TYPES.filter(t=>t.slot===SLOTS[slot]).length);
    assert.equal(new Set(Object.values(counts)).size,1);
  }
  assert.deepEqual(reached,new Set(CHEST_GEAR.map(g=>g.id)));
  const e=createEconomy(0);mintFixture(e,scope,75*250);const c=character(e,scope,key);
  for(const tierRoll of [0,950000,990000,998000,999905])for(let slot=0;slot<4;slot++)for(let type=0;type<(slot===2?3:4);type++){
    const id=openChest(e,scope,key,tierRoll,slot*2500,type);revealChest(e,scope,e.accounts[scope].chests);equip(e,scope,key,id);assert.equal(c.loadout[SLOTS[slot]],id);
  }
  assert.equal(e.accounts[scope].gemz,0);assert.equal(e.gemzBurned,18750);assert.ok(validateEconomy(JSON.parse(JSON.stringify(e))));
  const equipped=Object.values(c.loadout),id=beginEntry(e,scope,key,1);finishDeath(e,scope,id,2);
  for(const item of equipped)assert.equal(c.inventory[item],0);assert.equal(Object.values(c.inventory).filter(n=>n===1).length,71);
});
test('only a cleared boss rolls the 0.25% jackpot; it pays 80%, retains 20% and awards a weapon',()=>{
  const e=createEconomy(0),id=beginEntry(e,scope,key,1),saved=structuredClone(e);
  finishVictory(e,scope,id,1,0);assert.deepEqual(e,saved);finishDeath(e,scope,id,1);
  character(e,scope,key).lockedUntil=0;clear(e,{jackpot:24,weapon:0});
  assert.equal(e.jackpotPaid,24*RF);assert.equal(e.jackpots[1],6*RF);assert.equal(e.jackpots[2],0);
  assert.deepEqual(e.accounts[scope].active.items,[401,104]);assert.ok(validateEconomy(e));
  const miss=createEconomy(0);clear(miss,{jackpot:25});assert.equal(miss.jackpotPaid,0);
  let wins=0;for(let roll=0;roll<10000;roll++){const w=createEconomy(0);clear(w,{jackpot:roll});if(w.jackpotPaid)wins++;}assert.equal(wins,25);
});
test('duplicate kills, victory and death do not duplicate or destroy rewards twice',()=>{
  const e=createEconomy(0),id=clear(e,{jackpot:0,weapon:0,bonusPotion:0}),saved=structuredClone(e);
  creditKill(e,scope,id,12,true,rolls);finishVictory(e,scope,id,10,0);finishDeath(e,scope,id,10);assert.deepEqual(e,saved);
});
test('any account can redeem pro rata without a clear; balances and rounding conserve RF',()=>{
  const e=createEconomy(0);clear(e);mintFixture(e,'buyer',300);contribute(e,scope,100,1);contribute(e,'buyer',300,1);
  assert.equal(Object.keys(e.accounts.buyer.characters).length,0);assert.equal(totalContributed(e),400);
  assert.equal(settleRound(e,ROUND_MS-1),false);const before=totalRF(e);settleRound(e,ROUND_MS);
  assert.deepEqual(e.pool.last.payouts,{buyer:60*RF,guest:20*RF});assert.equal(e.gemzBurned,400);assert.equal(e.pool.rf,0);assert.equal(totalRF(e),before);assert.ok(validateEconomy(e));
  const saved=structuredClone(e);settleRound(e,ROUND_MS);assert.deepEqual(e,saved);
  const odd=createEconomy(0);clear(odd);mintFixture(odd,'a',1);mintFixture(odd,'b',1);mintFixture(odd,'c',1);
  for(const who of ['a','b','c'])contribute(odd,who,1,1);settleRound(odd,ROUND_MS);
  assert.deepEqual(odd.pool.last.payouts,{a:26666667,b:26666667,c:26666666});assert.ok(validateEconomy(odd));
});
test('empty rounds carry RF, expired deposits settle before new contributions, no double spend',()=>{
  const e=createEconomy(0);clear(e);settleRound(e,ROUND_MS);assert.equal(e.pool.rf,80*RF);
  contribute(e,scope,50,ROUND_MS+1);const before=structuredClone(e);
  assert.throws(()=>contribute(e,scope,51,ROUND_MS+2));assert.deepEqual(e,before);
  settleRound(e,2*ROUND_MS);assert.equal(e.accounts[scope].gemz,50);assert.equal(e.accounts[scope].rf,480*RF);
  assert.throws(()=>contribute(e,scope,1,2*ROUND_MS+1),/empty/);assert.ok(validateEconomy(e));
});
test('soulbound weapon remains equipped and cannot be moved to another Friend; potions reset on death',()=>{
  const e=createEconomy(0);clear(e,{weapon:0});const c=character(e,scope,key);c.inventory[7]=2;c.potions['minor:attack']='999999999999999999999999999999';
  equip(e,scope,key,401);equip(e,scope,key,7);consumePotion(e,scope,key,'minor:attack');assert.equal(c.points.attack,1);
  assert.throws(()=>equip(e,scope,'generation:other',401));
  const id=beginEntry(e,scope,key,100);finishDeath(e,scope,id,200);
  assert.equal(c.inventory[401],1);assert.equal(c.loadout.weapon,401);assert.equal(c.inventory[7],1);assert.equal(c.loadout.armor,EMPTY_LOADOUT.armor);
  assert.equal(c.points.attack,0);assert.equal(c.potions['minor:attack'],'999999999999999999999999999998');assert.equal(c.lockedUntil,200+LOCKOUT_MS);
  const saved=structuredClone(e);finishDeath(e,scope,id,300);assert.deepEqual(e,saved);assert.throws(()=>beginEntry(e,scope,key,200+LOCKOUT_MS-1));assert.ok(validateEconomy(e));
});
test('Genesis retains equipment and avoids recovery, but consumed potion bonuses reset',()=>{
  const e=createEconomy(0),c=character(e,scope,'genesis:1','genesis');c.inventory[3]=1;equip(e,scope,'genesis:1',3);c.potions['major:health']='2';
  consumePotion(e,scope,'genesis:1','major:health');assert.equal(c.points.health,2);const id=beginEntry(e,scope,'genesis:1',1);finishDeath(e,scope,id,2);
  assert.equal(c.loadout.weapon,3);assert.equal(c.lockedUntil,0);assert.equal(c.points.health,0);assert.equal(c.potions['major:health'],'1');beginEntry(e,scope,'genesis:1',3);
});
test('potion levels and sizes, extra-potion odds, stat cap and unlimited decimal inventory',()=>{
  for(let level=1;level<=5;level++){
    assert.equal(potionForLevel(level,0,0),(level===5?'major':'minor')+':health');
    assert.equal(potionForLevel(level,9999,9999),(level<=2?'minor':'major')+':dexterity');
  }
  const e=createEconomy(0);clear(e,{bonusPotion:1999});const c=character(e,scope,key);assert.equal(e.accounts[scope].active.potions.length,2);
  c.points.health=19;c.potions['major:health']='999999999999999999999999999999999999999999';const saved=structuredClone(e);
  consumePotion(e,scope,key,'major:health');assert.equal(c.points.health,21);assert.equal(c.drinks.health,20);
  const capped=structuredClone(e);assert.throws(()=>consumePotion(e,scope,key,'minor:health'),/20 potions/);assert.deepEqual(e,capped);assert.ok(validateEconomy(e));
  const miss=createEconomy(0);clear(miss,{bonusPotion:2000});assert.equal(miss.accounts[scope].active.potions.length,1);
});
test('legacy migration preserves all funds, equipment and recovery, and is idempotent',()=>{
  const legacy={version:2,rf:20*RF,gemz:100,staked:20,slots:100*RF,jackpot:2*RF,ecosystem:RF,stakingPool:0,stakingClaim:0,characters:{[key]:{kind:'generation',inventory:{1:2},loadout:{...EMPTY_LOADOUT,weapon:1},lockedUntil:123,clears:4,best:55}},active:null};
  const e=createEconomy(0);migrateLegacy(e,scope,legacy,1);const p=e.accounts[scope];
  assert.equal(p.rf,520*RF);assert.equal(p.gemz,120);assert.equal(p.characters[key].loadout.weapon,1);assert.equal(p.characters[key].lockedUntil,123);
  assert.equal(e.pool.rf,100*RF);assert.equal(e.jackpots[1],2*RF);assert.equal(e.seedRF,623*RF);assert.ok(validateEconomy(e));
  const saved=structuredClone(e);migrateLegacy(e,scope,legacy,2);assert.deepEqual(e,saved);
  const abandoned=createEconomy(0);migrateLegacy(abandoned,scope,{...legacy,active:{friend:key,ended:false}},10);
  assert.equal(abandoned.accounts[scope].characters[key].inventory[1],1);assert.equal(abandoned.accounts[scope].characters[key].lockedUntil,10+LOCKOUT_MS);
});
test('validation rejects corrupted contribution owners, potion counts and conservation',()=>{
  const e=createEconomy(0);clear(e);assert.ok(validateEconomy(e));
  const a=structuredClone(e);a.pool.contributions.unknown=1;assert.equal(validateEconomy(a),false);
  const b=structuredClone(e);b.accounts[scope].characters[key].potions['minor:health']='-1';assert.equal(validateEconomy(b),false);
  const c=structuredClone(e);c.accounts[scope].rf++;assert.equal(validateEconomy(c),false);
});


test('redemption previews include the new contribution, disclose dilution and do not spend GEMZ',()=>{
  const e=createEconomy(0);clear(e);mintFixture(e,'other',300);contribute(e,'other',300,1);
  const before=structuredClone(e),preview=redemptionPreview(e,scope,100);
  assert.deepEqual(preview,{mine:100,total:400,share:.25,rf:20*RF});assert.deepEqual(e,before);
  contribute(e,scope,100,1);assert.deepEqual(redemptionPreview(e,scope),preview);
  mintFixture(e,'later',400);contribute(e,'later',400,1);assert.equal(redemptionPreview(e,scope).rf,10*RF);
  settleRound(e,ROUND_MS);assert.equal(e.pool.last.payouts.guest,10*RF);assert.ok(validateEconomy(e));
  assert.throws(()=>redemptionPreview(e,scope,-1));assert.throws(()=>redemptionPreview(e,scope,.5));
});
test('a solo contribution receives the full round; chest spending cannot be redeemed again',()=>{
  const e=createEconomy(0);for(let i=0;i<5;i++)clear(e);
  assert.deepEqual(entryAllocation(100*RF),{redemption:80*RF,jackpot:15*RF,ecosystem:5*RF});
  assert.equal(e.pool.rf,400*RF);assert.equal(e.jackpots[1],75*RF);assert.equal(e.ecosystem,25*RF);
  const chestWorld=structuredClone(e);openChest(chestWorld,scope,key,0,0,0);revealChest(chestWorld,scope,1);openChest(chestWorld,scope,key,0,0,0);
  assert.throws(()=>contribute(chestWorld,scope,1,1));assert.equal(chestWorld.pool.rf,400*RF);
  assert.equal(redemptionPreview(e,scope,1).rf,400*RF);
  contribute(e,scope,1,1);settleRound(e,ROUND_MS);
  assert.equal(e.accounts[scope].gemz,499);assert.equal(e.accounts[scope].rf,400*RF);
  assert.equal(e.redemptionPaid,400*RF);assert.ok(validateEconomy(e));assert.ok(validateEconomy(chestWorld));
});
test('a failed run funds all destinations but only keeps earned GEMZ, with no jackpot payout',()=>{
  const e=createEconomy(0),id=beginEntry(e,scope,key,1);
  creditKill(e,scope,id,1,false,rolls);finishDeath(e,scope,id,2);finishVictory(e,scope,id,1,0);
  assert.equal(e.accounts[scope].gemz,3);assert.equal(e.pool.rf,80*RF);assert.equal(e.jackpots[1],15*RF);
  assert.equal(e.jackpotPaid,0);assert.equal(e.accounts[scope].rf,400*RF);assert.ok(validateEconomy(e));
});
