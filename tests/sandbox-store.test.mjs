import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalScope,prepareWorld,validateSessionSave} from '../games/relic-run/sandbox-store.ts';
import {character,beginEntry,openChest,contribute,settleRound,validateEconomy,LOCKOUT_MS} from '../games/relic-run/economy.ts';
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
