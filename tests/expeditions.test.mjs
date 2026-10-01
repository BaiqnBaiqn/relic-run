import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS} from '../games/relic-run/levels.ts';
import {makeRun,startRoom,enterBoss,step} from '../games/relic-run/engine.ts';
import {bossPattern,hazardHits} from '../games/relic-run/encounters.ts';
import {bossLoot,gearFor} from '../games/relic-run/gear.ts';
import {createEconomy,beginEntry,creditKill,finishVictory,finishDeath,validateEconomy,character,addTestRF,RF} from '../games/relic-run/economy.ts';

const rolls={gemz:5000,weapon:0,bonusPotion:0,size:9999,stat:0,secondSize:0,secondStat:9999},idle={x:0,y:0,dash:false};
test('all expeditions fund one redemption pool, their own jackpot, and exact full-clear GEMZ with unique soulbound loot',()=>{
  const e=createEconomy(0);let totalCost=0;
  for(const l of LEVELS){
    addTestRF(e,'player',10000);const id=beginEntry(e,'player','friend',1,l.id);totalCost+=l.entryRF*RF;
    assert.equal(e.pool.rf,totalCost*.8);assert.equal(e.jackpots[l.id],l.entryRF*RF*.15);
    finishVictory(e,'player',id,20,0);assert.equal(e.accounts.player.active.jackpot,null,'no jackpot without boss');
    for(let i=1;i<=11;i++)creditKill(e,'player',id,i,false,rolls);
    creditKill(e,'player',id,12,true,rolls);creditKill(e,'player',id,12,true,rolls);
    assert.equal(e.accounts.player.active.gemz,l.gemz);
    assert.deepEqual(e.accounts.player.active.items,[l.weaponIds[0]]);
    const potions=e.accounts.player.active.potions;
    assert.equal(potions[0].split(':')[0],l.id<3?'minor':'major');
    assert.equal(potions[1].split(':')[0],l.id===5?'major':'minor');
    finishVictory(e,'player',id,30,0);const after=structuredClone(e);finishVictory(e,'player',id,30,0);assert.deepEqual(e,after);
    assert.equal(e.accounts.player.active.jackpot,l.entryRF*RF*.12);
    assert.equal(e.jackpots[l.id],l.entryRF*RF*.03);
    assert.deepEqual(e.accounts.player.active.items,[l.weaponIds[0],l.jackpotWeapon]);
    assert.ok(validateEconomy(e));
    const tally=new Map();for(let roll=0;roll<10000;roll++){const item=bossLoot(roll,l.id);tally.set(item,(tally.get(item)??0)+1);}
    assert.deepEqual([...tally],[...l.weaponIds.map((id,i)=>[id,125]),[null,9500]]);
    for(const id of [...l.weaponIds,l.jackpotWeapon])assert.ok(gearFor(id).soulbound);
  }
  assert.equal(new Set(LEVELS.flatMap(l=>[...l.weaponIds,l.jackpotWeapon])).size,25);
  assert.throws(()=>beginEntry(e,'player','friend',1,6),/Unknown expedition/);
  const corrupt=structuredClone(e);corrupt.accounts.player.active.level=6;assert.equal(validateEconomy(corrupt),false);
});
test('higher-level defeat retains earned GEMZ, resets points, loses ordinary equipped gear, and gives no jackpot',()=>{
  const e=createEconomy(0),c=character(e,'player','friend');c.inventory[205]=1;c.inventory[114]=1;c.loadout.weapon=114;c.loadout.ring=315;c.inventory[315]=1;c.points.health=5;
  addTestRF(e,'player',1600);const id=beginEntry(e,'player','friend',1,5);creditKill(e,'player',id,1,false,rolls);finishDeath(e,'player',id,2);finishVictory(e,'player',id,3,0);
  assert.equal(e.accounts.player.gemz,70);assert.equal(e.accounts.player.active.jackpot,null);assert.equal(c.loadout.weapon,114);assert.equal(c.inventory[315],0);assert.equal(c.points.health,0);assert.ok(c.lockedUntil>2);assert.ok(validateEconomy(e));
});
function bossRun(level){const s=makeRun(undefined,42,undefined,level);s.phase='door';enterBoss(s);s.attack=999;return s;}
test('new boss patterns have warnings, locked aim, usable tide gaps and safe crossing lanes',()=>{
  for(const id of [2,3,4,5]){
    const s=bossRun(id),b=s.enemies[0];for(let i=0;i<4;i++)bossPattern(s,b);
    assert.ok(s.hazards.length);assert.ok(s.hazards.every(h=>h.delay>=1.15));
    for(const h of s.hazards){
      assert.equal(hazardHits(h,s),false,'warnings cause no damage');
      const live={...h,delay:0};
      if(h.kind==='tide'){
        const gap={x:h.vx?h.x:h.gap,y:h.vx?h.gap:h.y};assert.equal(hazardHits(live,gap),false);
        assert.equal(hazardHits(live,h.vx?{x:h.x,y:h.gap+120}:{x:h.gap+120,y:h.y}),true);
      }else if(h.kind==='heat'){assert.equal(hazardHits(live,{x:480,y:480}),false);assert.equal(hazardHits(live,{x:h.x+100,y:h.y+100}),true);}
      else if(h.kind==='beam'){const angle=h.angle;s.x+=100;s.y+=100;assert.equal(h.angle,angle);assert.equal(hazardHits(live,{x:h.x+Math.cos(h.angle)*100,y:h.y+Math.sin(h.angle)*100}),true);}
    }
  }
});
test('each new boss shields once at half health, clears hazards, and requires two summoned guards',()=>{
  for(const l of LEVELS.slice(1)){
    const s=bossRun(l.id),b=s.enemies[0];bossPattern(s,b);s.attack=999;s.x=b.x-100;s.y=b.y;
    s.shots=[{id:s.nextId++,x:b.x,y:b.y,vx:0,vy:0,life:1,damage:99999,enemy:false,pierce:0,hit:[],r:4}];step(s,idle,1/60);
    assert.equal(b.hp,b.maxHp/2);assert.ok(b.shielded);assert.equal(s.hazards.length,0);assert.equal(s.enemies.filter(e=>e.summoned).length,2);
    for(const e of s.enemies)if(e.summoned)e.hp=0;step(s,idle,1/60);assert.equal(b.shielded,false);
    s.shots=[{id:s.nextId++,x:b.x,y:b.y,vx:0,vy:0,life:1,damage:99999,enemy:false,pierce:0,hit:[],r:4}];step(s,idle,1/60);assert.equal(s.phase,'won');assert.equal(s.hazards.length,0);
  }
});
test('beam telegraphs do no damage until activation and obey one-hit shields',()=>{
  for(const shield of [false,true]){
    const s=bossRun(3),b=s.enemies[0];s.shield=shield;bossPattern(s,b);b.cool=999;
    for(let i=0;i<66;i++)step(s,idle,1/60);assert.equal(s.hp,s.maxHp);assert.equal(s.shield,shield);
    for(let i=0;i<6;i++)step(s,idle,1/60);
    if(shield){assert.equal(s.shield,false);assert.equal(s.hp,s.maxHp,'shield absorbs the beam once for its whole flash');}
    else assert.equal(s.hp,Math.max(0,s.maxHp-LEVELS[2].damage));
  }
});
test('all four new expeditions can be cleared with recommended ranged and melee gear through the real reward ledger',()=>{
  const route=[[720,680],[760,300],[480,180],[200,300],[200,680],[480,760]];
  for(const l of LEVELS.slice(1))for(const type of ['wand','sword','dagger']){
    const loadout={weapon:({wand:200,sword:220,dagger:230}[type])+l.id,ability:270+l.id,armor:300+l.id,ring:310+l.id};
    const s=makeRun(loadout,42,undefined,l.id),e=createEconomy(0);addTestRF(e,'player',1600);const id=beginEntry(e,'player','friend',1,l.id);startRoom(s);let point=0,credited=0;
    for(let tick=0;tick<18000&&!['won','dead'].includes(s.phase);tick++){
      if(s.phase==='door'){assert.equal(s.kills,9);enterBoss(s);point=0;}
      let x=0,y=0;
      const target=s.enemies.filter(e=>e.hp>0&&!e.shielded).sort((a,b)=>Math.hypot(a.x-s.x,a.y-s.y)-Math.hypot(b.x-s.x,b.y-s.y))[0];
      if(type==='wand'){
        let [tx,ty]=route[point];if(Math.hypot(tx-s.x,ty-s.y)<16){point=(point+1)%route.length;[tx,ty]=route[point];}
        const d=Math.hypot(tx-s.x,ty-s.y)||1;x=(tx-s.x)/d;y=(ty-s.y)/d;
      }else if(target){const a=Math.atan2(s.y-target.y,s.x-target.x)+.25,range=type==='sword'?85:65,dx=target.x+Math.cos(a)*range-s.x,dy=target.y+Math.sin(a)*range-s.y,d=Math.hypot(dx,dy)||1;x=dx/d;y=dy/d;}
      step(s,{x,y,dash:type!=='wand'&&!!target&&(target.windup>0||target.charge>0),ability:true},1/60);
      for(const kill of s.defeated.slice(credited))creditKill(e,'player',id,kill.id,kill.boss,rolls);credited=s.defeated.length;
    }
    assert.equal(s.phase,'won',`L${l.id} ${type}`);assert.equal(s.kills,12);assert.ok(s.hp>0);assert.ok(s.summoned);
    finishVictory(e,'player',id,s.time,9999);assert.equal(e.accounts.player.gemz,l.gemz);assert.ok(validateEconomy(e));
  }
});
