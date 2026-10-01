import test from 'node:test';
import assert from 'node:assert/strict';
import {createEconomy,account,beginEntry,finishDeath,contribute,settleRound,validateEconomy,totalRF,RF,ROUND_MS} from '../games/relic-run/economy.ts';

function fund(e,scope,now){const id=beginEntry(e,scope,'friend',now);finishDeath(e,scope,id,now);e.accounts[scope].characters.friend.lockedUntil=0;}
function mint(e,scope,amount){account(e,scope).gemz+=amount;e.gemzMinted+=amount;}

test('24-hour UTC seasons credit only their contributors, then reset without moving level jackpots',()=>{
  const e=createEconomy(10*3600000);assert.equal(e.pool.closesAt,ROUND_MS);
  mint(e,'a',100);mint(e,'b',100);fund(e,'a',10*3600000);
  contribute(e,'a',75,ROUND_MS-2);contribute(e,'b',25,ROUND_MS-1);
  const before=totalRF(e),jackpot=e.jackpots[1];assert.equal(settleRound(e,ROUND_MS-1),false);
  assert.equal(settleRound(e,ROUND_MS),true);assert.deepEqual(e.pool.last.payouts,{a:60*RF,b:20*RF});
  assert.equal(e.pool.last.startedAt,0);assert.equal(e.pool.last.endedAt,ROUND_MS);assert.equal(e.pool.closesAt,2*ROUND_MS);
  assert.deepEqual(e.pool.contributions,{});assert.equal(e.pool.rf,0);assert.equal(e.jackpots[1],jackpot);assert.equal(e.gemzBurned,100);
  fund(e,'b',ROUND_MS);contribute(e,'b',1,ROUND_MS);settleRound(e,2*ROUND_MS);
  assert.deepEqual(e.pool.last.payouts,{b:80*RF});assert.equal(e.pool.history.length,2);assert.equal(totalRF(e),before);
  const snapshot=structuredClone(e);assert.equal(settleRound(e,2*ROUND_MS),false);assert.deepEqual(e,snapshot);assert.ok(validateEconomy(e));
});

test('returning after several days pays the expired season once and advances to the current UTC window',()=>{
  const e=createEconomy(0);mint(e,'a',100);fund(e,'a',1);contribute(e,'a',100,2);
  const saved=JSON.parse(JSON.stringify(e)),now=4*ROUND_MS+12345;settleRound(saved,now);
  assert.equal(saved.pool.round,5);assert.equal(saved.pool.closesAt,5*ROUND_MS);assert.equal(saved.pool.history.length,1);
  assert.equal(saved.pool.last.round,1);assert.equal(saved.pool.last.endedAt,ROUND_MS);assert.equal(saved.accounts.a.rf,480*RF);
  const again=structuredClone(saved);settleRound(saved,now);assert.deepEqual(saved,again);assert.ok(validateEconomy(saved));
});

test('new entries at the boundary fund the new season, while empty seasons carry RF and old saves stay valid',()=>{
  const e=createEconomy(0);mint(e,'a',10);fund(e,'a',1);contribute(e,'a',1,2);
  fund(e,'b',ROUND_MS);assert.equal(e.pool.last.rf,80*RF);assert.equal(e.pool.rf,80*RF);assert.equal(e.pool.contributions.a,undefined);
  settleRound(e,4*ROUND_MS);assert.equal(e.pool.round,5);assert.equal(e.pool.rf,80*RF);assert.equal(e.pool.history.length,1);
  const legacy=structuredClone(e);delete legacy.pool.history;delete legacy.pool.last.startedAt;delete legacy.pool.last.endedAt;
  assert.ok(validateEconomy(legacy));assert.ok(validateEconomy(e));
});

test('season history retains the latest 30 paid seasons and rejects corrupt dates',()=>{
  const e=createEconomy(0);mint(e,'a',40);
  // Move existing simulated RF into the pool so each season can settle a tiny amount.
  for(let n=0;n<35;n++){e.accounts.a.rf-=RF;e.pool.rf+=RF;contribute(e,'a',1,n*ROUND_MS+1);settleRound(e,(n+1)*ROUND_MS);}
  assert.equal(e.pool.history.length,30);assert.equal(e.pool.history[0].round,6);assert.equal(e.pool.history.at(-1).round,35);assert.ok(validateEconomy(e));
  e.pool.history[0].endedAt++;assert.equal(validateEconomy(e),false);
});
