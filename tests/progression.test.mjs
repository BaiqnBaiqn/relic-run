import test from 'node:test';
import assert from 'node:assert/strict';
import {entryQuote,lootMultiplier,maxEntryMultiple} from '../games/relic-run/entry.ts';
import {LEVELS,gemzDrop} from '../games/relic-run/levels.ts';
import {createEconomy,character,addTestRF,beginEntry,creditKill,finishVictory,finishDeath,consumePotion,validateEconomy,RF} from '../games/relic-run/economy.ts';
import {bossWeaponDrops,EMPTY_LOADOUT,statsFor} from '../games/relic-run/gear.ts';
import {STATS,potionDrinks} from '../games/relic-run/potions.ts';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';
const rolls={weapon:9999,extraWeapons:[9999,9999,9999,9999],bonusPotion:9999,size:0,stat:0,secondSize:0,secondStat:0,gemz:5000};

test('entry caps grow fivefold, loot is concave and 50× entry gives exactly 20× weapon rewards',()=>{
  assert.deepEqual(LEVELS.map(l=>l.entryRF),[100,200,400,800,1600]);
  assert.deepEqual(LEVELS.map(l=>maxEntryMultiple(l.id)),[50,250,1250,6250,31250]);
  assert.equal(lootMultiplier(1),1);assert.equal(lootMultiplier(50),20);
  for(let m=2;m<=31250;m++)assert.ok(lootMultiplier(m)<m,`loot must grow slower than spend at ${m}×`);
  assert.ok(lootMultiplier(10)-lootMultiplier(1)>lootMultiplier(20)-lootMultiplier(11));
  for(const l of LEVELS){
    for(const m of [0,-1,1.5,NaN,Infinity,maxEntryMultiple(l.id)+1])assert.throws(()=>entryQuote(l.id,m));
    const q=entryQuote(l.id,maxEntryMultiple(l.id));assert.ok(Number.isSafeInteger(q.costRF*RF));
    assert.ok(q.guaranteedWeapons<=4);assert.ok(q.extraWeaponBps<10000);
  }
});

test('boosted entries debit and fund once; every GEMZ outcome scales exactly; jackpot and potions do not',()=>{
  for(const l of LEVELS)for(const m of [1,50,maxEntryMultiple(l.id)]){
    const q=entryQuote(l.id,m),e=createEconomy(0);addTestRF(e,'p',q.costRF);
    const id=beginEntry(e,'p','friend',1,l.id,m);assert.equal(e.accounts.p.rf,500*RF);
    assert.equal(e.pool.rf,q.costRF*RF*.8);assert.equal(e.jackpots[l.id],q.costRF*RF*.15);assert.equal(e.ecosystem,q.costRF*RF*.05);
    const before=structuredClone(e);assert.throws(()=>beginEntry(e,'p','friend',1,l.id,m));assert.deepEqual(e,before);
    for(let n=1;n<=11;n++)creditKill(e,'p',id,n,false,rolls);
    creditKill(e,'p',id,12,true,rolls);assert.equal(e.accounts.p.active.gemz,q.gemz);
    assert.equal(e.accounts.p.active.items.length,q.guaranteedWeapons);assert.equal(e.accounts.p.active.potions.length,1);
    finishVictory(e,'p',id,30,25);assert.equal(e.jackpotPaid,0,'boost never turns a jackpot miss into a hit');
    const restored=JSON.parse(JSON.stringify(e));assert.ok(validateEconomy(restored));
    creditKill(restored,'p',id,12,true,{...rolls,weapon:0});finishVictory(restored,'p',id,30,0);assert.deepEqual(restored,e);
    assert.equal(restored.accounts.p.active.multiple,m);assert.equal(restored.accounts.p.active.costRF,q.costRF);
    let sum=0;for(let r=0;r<10000;r++)sum+=(gemzDrop(l,true,r)+l.minions*l.monsterGemz)*m;
    assert.equal(sum/10000,q.gemz);
  }
});

test('weapon boosts retain individual weapon weights and overflow into independently rolled additional weapons',()=>{
  for(const [multiple,total,weights] of [[1,500,[125,125,125,125]],[50,10000,[2500,2500,2500,2500]]]){
    const counts=[0,0,0,0];for(let r=0;r<10000;r++)for(const id of bossWeaponDrops([r],1,multiple))counts[[401,402,403,404].indexOf(id)]++;
    assert.deepEqual(counts,weights);assert.equal(counts.reduce((a,b)=>a+b),total);
  }
  const q=entryQuote(5,31250);assert.equal(q.guaranteedWeapons,4);
  const seen=[0,0,0,0];let extra=0;
  for(let r=0;r<10000;r++){
    const items=bossWeaponDrops([0,9999,0,9999,r],5,31250);assert.deepEqual(items.slice(0,4),[441,444,441,444]);
    if(items[4]){extra++;seen[[441,442,443,444].indexOf(items[4])]++;}
  }
  assert.equal(extra,q.extraWeaponBps);assert.ok(seen.every(n=>n>0));
  assert.throws(()=>bossWeaponDrops([0],5,31250),/Missing/);
});

test('invalid or unaffordable boosts leave funds unchanged; losses retain scaled GEMZ without jackpot',()=>{
  const e=createEconomy(0);character(e,'p','friend');const before=structuredClone(e);
  for(const m of [0,51,1.5,NaN,50]){assert.throws(()=>beginEntry(e,'p','friend',1,1,m));assert.deepEqual(e,before);}
  addTestRF(e,'p',5000);const id=beginEntry(e,'p','friend',1,1,50);creditKill(e,'p',id,1,false,rolls);
  finishDeath(e,'p',id,2);finishVictory(e,'p',id,30,0);assert.equal(e.accounts.p.gemz,150);assert.equal(e.jackpotPaid,0);assert.ok(validateEconomy(e));
  const bad=structuredClone(e);bad.accounts.p.active.multiple=51;assert.equal(validateEconomy(bad),false);
});

test('twenty drinks per stat: minor health reaches 110 HP, majors count once, death resets only consumed bonuses',()=>{
  for(const kind of ['generation','genesis']){
    const e=createEconomy(0),c=character(e,'p','friend',kind);assert.equal(statsFor(c.loadout).health,10);
    for(const stat of STATS){c.potions[`minor:${stat}`]='999999999999999999999';for(let i=0;i<20;i++)consumePotion(e,'p','friend',`minor:${stat}`);}
    assert.deepEqual(potionDrinks(c),{health:20,attack:20,speed:20,dexterity:20});
    const stats=statsFor(c.loadout,c.points);assert.equal(stats.health,110);assert.equal(stats.attackBonus,2);assert.equal(stats.speed,260);assert.equal(stats.attackRate,2);
    for(const stat of STATS){const before=structuredClone(e);assert.throws(()=>consumePotion(e,'p','friend',`minor:${stat}`),/20 potions/);assert.deepEqual(e,before);}
    const stash=structuredClone(c.potions),id=beginEntry(e,'p','friend',1);finishDeath(e,'p',id,2);
    assert.equal(statsFor(c.loadout,c.points).health,10);assert.ok(Object.values(potionDrinks(c)).every(n=>n===0));assert.deepEqual(c.potions,stash);
    c.potions['major:health']='21';for(let i=0;i<20;i++)consumePotion(e,'p','friend','major:health');
    assert.equal(c.points.health,40);assert.equal(c.drinks.health,20);assert.equal(statsFor(c.loadout,c.points).health,210);
    assert.throws(()=>consumePotion(e,'p','friend','major:health'));assert.equal(c.potions['major:health'],'1');assert.ok(validateEconomy(e));
  }
});

test('pre-boost saves retain their balances, potion bonuses and default 1× rewards',()=>{
  const e=createEconomy(0),c=character(e,'p','friend');c.points.health=8;c.potions['minor:health']='1';
  const id=beginEntry(e,'p','friend',1);delete e.accounts.p.active.multiple;delete e.accounts.p.active.costRF;
  assert.ok(validateEconomy(JSON.parse(JSON.stringify(e))));assert.equal(creditKill(e,'p',id,1,false,rolls),3);
  finishVictory(e,'p',id,30,0);assert.equal(e.jackpotPaid,0);
  e.accounts.p.active.ended=true;consumePotion(e,'p','friend','minor:health');assert.equal(c.drinks.health,9);assert.equal(c.points.health,9);
});

function pilot(level,loadout=EMPTY_LOADOUT,points){
  const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]],s=makeRun(loadout,42,points,level);startRoom(s);let point=0;
  for(let tick=0;tick<18000&&!['won','dead'].includes(s.phase);tick++){
    if(s.phase==='door'){enterBoss(s);point=0;}
    let [x,y]=route[point];if(Math.hypot(x-s.x,y-s.y)<16){point=(point+1)%route.length;[x,y]=route[point];}
    const d=Math.hypot(x-s.x,y-s.y)||1,danger=s.shots.some(b=>b.enemy&&Math.hypot(b.x-s.x,b.y-s.y)<70)||s.enemies.some(e=>Math.hypot(e.x-s.x,e.y-s.y)<e.r+50);
    step(s,{x:(x-s.x)/d,y:(y-s.y)/d,dash:danger,ability:true},1/60);
  }return s;
}
test('a fixed dodge route clears L1 with starters, fails L2 with starters, and clears L2 with T1 chest gear plus earned potions',()=>{
  const starter=pilot(1),undergeared=pilot(2),geared=pilot(2,{weapon:201,ability:271,armor:301,ring:311},{health:10,attack:5,speed:0,dexterity:5});
  assert.equal(starter.phase,'won');assert.equal(starter.maxHp,10);assert.equal(undergeared.phase,'dead');assert.equal(geared.phase,'won');assert.equal(geared.kills,12);assert.ok(geared.hp>0);
});
