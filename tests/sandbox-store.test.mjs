import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalScope,prepareWorld,validateSessionSave} from '../games/relic-run/sandbox-store.ts';
import {character,beginEntry,openChest,contribute,settleRound,validateEconomy,LOCKOUT_MS,creditKill,finishVictory,addTestRF,RF} from '../games/relic-run/economy.ts';
const a=canonicalScope('0x3333333333333333333333333333333333333333');
const b=canonicalScope('0x4444444444444444444444444444444444444444');
const json=JSON.stringify;
function world(){let w=prepareWorld(null,a,7730n,0);return prepareWorld(json(w),b,3412n,0);}
test('canonical save identity excludes owner EOA and rejects invalid NFT wallets',()=>{
  assert.equal(a,'friend:4663:0x3333333333333333333333333333333333333333');
  assert.throws(()=>canonicalScope('guest'));assert.throws(()=>canonicalScope('0x'+'0'.repeat(40)));
  const first=world();assert.deepEqual(prepareWorld(json(first),a,7730n,1),first);
});
test('sandbox accepts purchased chest inventory and rejects cross-Friend mutation',()=>{
  const w=world();w.accounts[a].gemz=500;w.gemzMinted=500;
  const next=structuredClone(w);openChest(next,a,'generation:7730',0,0,0);
  assert.deepEqual(validateSessionSave(w,json(next),a,7730n,1),next);
  const other=structuredClone(next);character(other,b,'generation:3412').inventory[201]=1;
  assert.ok(validateEconomy(other));assert.throws(()=>validateSessionSave(w,json(other),a,7730n,1),/another Friend/);
  const extra=structuredClone(next);character(extra,a,'generation:9999');
  assert.throws(()=>validateSessionSave(w,json(extra),a,7730n,1),/belong/);
  assert.throws(()=>validateSessionSave(w,'{}',a,7730n,1),/validation/);
});
test('sandbox season settlement may credit another canonical wallet exactly once',()=>{
  const w=world();beginEntry(w,a,'generation:7730',1);
  w.accounts[b].gemz=50;w.gemzMinted=50;contribute(w,b,50,2);
  const next=structuredClone(w);settleRound(next,w.pool.closesAt);
  assert.deepEqual(validateSessionSave(w,json(next),a,7730n,w.pool.closesAt),next);
  assert.deepEqual(validateSessionSave(next,json(next),a,7730n,w.pool.closesAt+1),next);
});
test('sandbox reload loses equipped ordinary items once and enforces recovery',()=>{
  const w=world(),c=character(w,a,'generation:7730');c.inventory[201]=1;c.loadout.weapon=201;
  beginEntry(w,a,'generation:7730',1);
  const recovered=prepareWorld(json(w),a,7730n,100);
  assert.equal(recovered.accounts[a].active.ended,true);
  assert.equal(recovered.accounts[a].characters['generation:7730'].inventory[201],0);
  assert.equal(recovered.accounts[a].characters['generation:7730'].lockedUntil,100+LOCKOUT_MS);
  assert.deepEqual(prepareWorld(json(recovered),a,7730n,200),recovered);
  assert.ok(validateEconomy(recovered));
});
test('sandbox rejects conserved theft of another contributor’s locked GEMZ',()=>{
  const w=world();beginEntry(w,a,'generation:7730',1);w.accounts[b].gemz=50;w.gemzMinted=50;contribute(w,b,50,2);
  const attack=structuredClone(w);delete attack.pool.contributions[b];attack.pool.contributions[a]=50;
  assert.ok(validateEconomy(attack));assert.throws(()=>validateSessionSave(w,json(attack),a,7730n,3),/contribution/);
});
test('sandbox rejects conserved theft from global RF, level jackpots and ecosystem',()=>{
  const w=world();beginEntry(w,a,'generation:7730',1);
  for(const reserve of ['pool','jackpot','ecosystem']){
    const attack=structuredClone(w);attack.accounts[a].rf+=RF;
    if(reserve==='pool')attack.pool.rf-=RF;else if(reserve==='jackpot')attack.jackpots[1]-=RF;else attack.ecosystem-=RF;
    assert.ok(validateEconomy(attack));assert.throws(()=>validateSessionSave(w,json(attack),a,7730n,2),/divert/);
  }
});
test('sandbox rejects season extension, early settlement and rewritten payout history',()=>{
  const w=world(),extended=structuredClone(w);extended.pool.closesAt+=86400000;
  assert.ok(validateEconomy(extended));assert.throws(()=>validateSessionSave(w,json(extended),a,7730n,1),/season dates/);
  const early=structuredClone(w);settleRound(early,w.pool.closesAt);
  assert.throws(()=>validateSessionSave(w,json(early),a,7730n,1),/transition/);
  beginEntry(w,a,'generation:7730',1);w.accounts[b].gemz=10;w.gemzMinted=10;contribute(w,b,10,2);settleRound(w,w.pool.closesAt);
  const history=structuredClone(w);history.pool.history[0].payouts={[a]:history.pool.history[0].rf};
  assert.ok(validateEconomy(history));assert.throws(()=>validateSessionSave(w,json(history),a,7730n,w.pool.closesAt-1),/settlements/);
});
test('sandbox allows real entry funding, preview faucet, boss jackpot and replay without duplicate payout',()=>{
  let w=world(),next=structuredClone(w);addTestRF(next,a,100);validateSessionSave(w,json(next),a,7730n,0);w=next;next=structuredClone(w);
  const id=beginEntry(next,a,'generation:7730',1);validateSessionSave(w,json(next),a,7730n,1);w=next;next=structuredClone(w);
  const rolls={gemz:5000,weapon:9999,bonusPotion:9999,size:0,stat:0,secondSize:0,secondStat:0};
  for(let i=1;i<=11;i++)creditKill(next,a,id,i,false,rolls);
  creditKill(next,a,id,12,true,rolls);finishVictory(next,a,id,60,0);
  assert.equal(next.accounts[a].active.jackpot,12*RF);
  validateSessionSave(w,json(next),a,7730n,2);validateSessionSave(next,json(next),a,7730n,3);
});
