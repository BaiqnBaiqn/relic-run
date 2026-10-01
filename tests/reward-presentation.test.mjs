import test from 'node:test';
import assert from 'node:assert/strict';
import {LEVELS,clearGemzRange,gemzDrop} from '../games/relic-run/levels.ts';
import {createEconomy,character,beginEntry,creditKill,finishVictory,finishDeath,equip,openChest,revealChest,validateEconomy,addTestRF} from '../games/relic-run/economy.ts';
import {STARTERS,GEAR} from '../games/relic-run/gear.ts';
import {makeRun,startRoom,step} from '../games/relic-run/engine.ts';

const rolls={weapon:9999,bonusPotion:9999,size:0,stat:0,secondSize:0,secondStat:0,gemz:5000};
test('every level has variable full-clear GEMZ, exact mean, bounded results and an independent reward roll',()=>{
  for(const l of LEVELS){
    const range=clearGemzRange(l),values=Array.from({length:10000},(_,roll)=>gemzDrop(l,true,roll)+l.minions*l.monsterGemz);
    assert.equal(Math.min(...values),range.min);assert.equal(Math.max(...values),range.max);
    assert.equal(values.reduce((n,v)=>n+v,0)/values.length,l.gemz);assert.ok(new Set(values).size>20);
    for(const roll of [0,5000,9999]){
      const e=createEconomy(0);addTestRF(e,'p',1600);const id=beginEntry(e,'p','generation:1',1,l.id);
      for(let n=1;n<=11;n++)creditKill(e,'p',id,n,false,rolls);
      const amount=creditKill(e,'p',id,12,true,{...rolls,gemz:roll});assert.equal(amount,gemzDrop(l,true,roll));
      const before=structuredClone(e);creditKill(e,'p',id,12,true,{...rolls,gemz:9999-roll});assert.deepEqual(e,before);
      finishVictory(e,'p',id,20,9999);assert.ok(validateEconomy(e));assert.equal(e.accounts.p.active.jackpot,0);
      const saved=JSON.parse(JSON.stringify(e));finishVictory(saved,'p',id,20,0);assert.deepEqual(saved,e,'reveals must never reroll or credit again');
    }
  }
  assert.throws(()=>gemzDrop(LEVELS[0],true,NaN));
});
test('chests and equipment belong to their selected Friend, and cooldown never locks a different Friend',()=>{
  const e=createEconomy(0),a=character(e,'p','generation:1'),b=character(e,'p','genesis:2','genesis');
  e.accounts.p.gemz=1000;e.gemzMinted=1000;
  const first=openChest(e,'p','generation:1',0,0,0);revealChest(e,'p',1);const second=openChest(e,'p','genesis:2',0,0,1);
  equip(e,'p','generation:1',first);equip(e,'p','genesis:2',second);
  assert.throws(()=>equip(e,'p','genesis:2',first),/does not own/);assert.equal(a.loadout.weapon,first);assert.equal(b.loadout.weapon,second);
  const run=beginEntry(e,'p','generation:1',1);finishDeath(e,'p',run,2);
  assert.ok(a.lockedUntil>2);assert.equal(b.lockedUntil,0);assert.equal(b.loadout.weapon,second);
  assert.throws(()=>beginEntry(e,'p','generation:1',3),/recovering/);const next=beginEntry(e,'p','genesis:2',3);finishDeath(e,'p',next,4);
  assert.equal(b.loadout.weapon,second);assert.ok(validateEconomy(e));
});
test('all saved item IDs resolve to a model family, including starters and soulbound boss items',async()=>{
  // JSON modules are bundled in the app; validate the same mapping through esbuild.
  const {build}=await import('esbuild');const result=await build({entryPoints:['games/relic-run/model-art.ts'],bundle:true,platform:'node',format:'esm',write:false});
  const {modelIcon}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
  for(const g of [...STARTERS,...GEAR]){const icon=modelIcon(g.id);assert.ok(icon?.src.startsWith('data:image/png;base64,'),g.name);assert.equal(icon.width,192);}
});
test('combat emits attack and ability sounds at actual activation, not on cooldown presses',()=>{
  const s=makeRun();startRoom(s);step(s,{x:0,y:0,dash:false,ability:true},1/60);assert.ok(s.sounds.includes('ability'));
  step(s,{x:0,y:0,dash:false,ability:true},1/60);assert.ok(!s.sounds.includes('ability'));
  s.enemies=[{id:8,kind:'slime',x:s.x+50,y:s.y,hp:100,maxHp:100,r:12,cool:999,flash:0,windup:0,charge:0,aim:{x:0,y:0},pattern:0}];s.attack=0;
  step(s,{x:0,y:0,dash:false},1/60);assert.ok(s.sounds.includes('attack'));
  step(s,{x:0,y:0,dash:false},1/60);assert.ok(!s.sounds.includes('attack'));
});
