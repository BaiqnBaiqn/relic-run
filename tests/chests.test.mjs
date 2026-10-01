import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PNG} from 'pngjs';
import {CHESTS,BASE_CHEST,CHEST_ROLL_SIZE,chestTier,expectedTierCost,T5_T1_COST_RATIO} from '../games/relic-run/chests.ts';
import {chestLoot,gearFor,CHEST_GEAR,SLOTS,ITEM_TYPES} from '../games/relic-run/gear.ts';
import {createEconomy,character,openChest,revealChest,validateEconomy} from '../games/relic-run/economy.ts';

test('four chests have exact probabilities, expected T5 cost stays 10000× T1, and no tier below each floor',()=>{
  assert.equal(CHESTS.length,4);assert.equal(T5_T1_COST_RATIO,10000);
  for(const chest of CHESTS){
    const counts=new Map();for(let roll=0;roll<CHEST_ROLL_SIZE;roll++){const tier=chestTier(chest.id,roll);counts.set(tier,(counts.get(tier)??0)+1);}
    assert.deepEqual([...counts],chest.odds.map(o=>[o.tier,o.chancePpm]));assert.equal(chest.odds.reduce((s,o)=>s+o.chancePpm,0),CHEST_ROLL_SIZE);
    assert.ok(chest.odds.every(o=>o.tier>=chest.floor));assert.ok(chest.odds.find(o=>o.tier===chest.floor).chancePpm>=780000);
    assert.equal(expectedTierCost(chest,5),expectedTierCost(BASE_CHEST,5));
    assert.equal(BigInt(chest.cost)*950000n,10000n*BigInt(BASE_CHEST.cost)*BigInt(chest.odds.find(o=>o.tier===5).chancePpm),'exact expected-cost ratio, without floating-point rounding');
    let boundary=0;
    for(const o of chest.odds){
      for(const slot of SLOTS){const ids=new Map();for(let type=0;type<12;type++){const id=chestLoot(boundary,SLOTS.indexOf(slot)*2500,type,chest.id);assert.equal(gearFor(id).tier,o.tier);ids.set(id,(ids.get(id)??0)+1);}
        assert.equal(ids.size,ITEM_TYPES.filter(t=>t.slot===slot).length);assert.equal(new Set(ids.values()).size,1);}
      boundary+=o.chancePpm;assert.equal(chestTier(chest.id,boundary-1),o.tier);
    }
  }
  for(const roll of [-1,1000000,NaN,Infinity,.5])assert.throws(()=>chestTier('overgrowth',roll));
  assert.throws(()=>chestLoot(0,0,0,'unknown'));
});
test('each purchase charges its chest price once, stores a durable result for that Friend, and reveals idempotently',()=>{
  const e=createEconomy(0),c=character(e,'p','friend');e.accounts.p.gemz=400000;e.gemzMinted=400000;let spent=0;
  for(const chest of CHESTS){
    const id=openChest(e,'p','friend',999999,2500,0,chest.id);spent+=chest.cost;
    assert.equal(gearFor(id).tier,5);assert.equal(gearFor(id).slot,'ability');assert.equal(e.accounts.p.gemz,400000-spent);assert.equal(e.gemzBurned,spent);
    assert.deepEqual(e.accounts.p.chestReceipt,{number:e.accounts.p.chests,chest:chest.id,item:id,friend:'friend',revealed:false});
    const saved=structuredClone(e);assert.throws(()=>openChest(e,'p','friend',0,0,0),/Reveal your saved/);assert.deepEqual(e,saved);
    const reloaded=JSON.parse(JSON.stringify(e));assert.ok(validateEconomy(reloaded));revealChest(e,'p',e.accounts.p.chests-1);assert.deepEqual(e,saved,'stale reveals cannot affect a new purchase');
    revealChest(e,'p',e.accounts.p.chests);const after=structuredClone(e);revealChest(e,'p',e.accounts.p.chests);assert.deepEqual(e,after);assert.ok(validateEconomy(e));
  }
  assert.equal(Object.values(c.inventory).reduce((s,n)=>s+n,0),4);
  const saved=structuredClone(e);assert.throws(()=>openChest(e,'p','friend',0,0,0,'astral'),/250,000 GEMZ/);assert.deepEqual(e,saved);
  const corrupted=structuredClone(e);corrupted.accounts.p.chestReceipt.friend='someone-else';assert.equal(validateEconomy(corrupted),false);
  const old=structuredClone(e);delete old.accounts.p.chestReceipt;assert.ok(validateEconomy(old),'older v3 saves remain valid');
});
test('all Blender sprite frames retain every visible pixel and remove excess transparent padding',async()=>{
  const dir='games/relic-run/art/models/lowpoly/',icons=JSON.parse(await readFile(dir+'icons.json','utf8')),frames=JSON.parse(await readFile(dir+'frames.json','utf8'));
  for(const g of CHEST_GEAR){const frame=frames[g.id],p=PNG.sync.read(Buffer.from(icons[g.id].src.split(',')[1],'base64'));
    assert.ok(frame.size<=192);assert.ok(frame.x>=0&&frame.y>=0&&frame.x+frame.size<=192&&frame.y+frame.size<=192);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++)if(p.data[(y*p.width+x)*4+3])assert.ok(x>=frame.x&&y>=frame.y&&x<frame.x+frame.size&&y<frame.y+frame.size,g.name);
  }
  assert.ok(frames[201].size<192,'starter wand is tightly framed');
});
