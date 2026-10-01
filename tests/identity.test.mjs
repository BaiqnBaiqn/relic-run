import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zeroAddress} from 'viem';
import {verifyFriend} from '../games/relic-run/identity.ts';

const owner='0x1111111111111111111111111111111111111111',other='0x2222222222222222222222222222222222222222',wallet='0x3333333333333333333333333333333333333333';
const friend={id:7730n,kind:'generation',label:'Friend #7730',walletAddress:other};
function fixture(overrides={}){
  const calls=[];let chains=0;
  return {calls,client:{
    getChainId:async()=>overrides.networkChanges&&++chains>2?1:overrides.chain??4663,
    getBlockNumber:async()=>123n,
    readContract:async request=>{calls.push(request);if(overrides.fail===request.functionName)throw new Error('RPC unavailable');return ({ownerOf:overrides.owner??owner,generation:overrides.generation??1,tokenBoundAccount:overrides.wallet??wallet})[request.functionName];},
  }};
}
test('fresh selection binds ownership and canonical wallet to the same block',async()=>{
  const f=fixture(),actual=await verifyFriend(f.client,owner,friend);
  assert.equal(actual.walletAddress,wallet,'Do not trust the discovery snapshot’s cached wallet');
  assert.deepEqual(f.calls.map(c=>c.functionName),['ownerOf','generation','tokenBoundAccount']);
  assert.ok(f.calls.every(c=>c.blockNumber===123n));
});
test('nonowners and generation zero cannot enter',async()=>{
  for(const settings of [{owner:other},{generation:0}]){
    const f=fixture(settings);await assert.rejects(verifyFriend(f.client,owner,friend),/must own this hardwired Friend/);
    assert.ok(!f.calls.some(c=>c.functionName==='tokenBoundAccount'));
  }
});
test('missing canonical wallet and failed reads fail closed',async()=>{
  await assert.rejects(verifyFriend(fixture({wallet:zeroAddress}).client,owner,friend),/no valid canonical wallet/);
  await assert.rejects(verifyFriend(fixture({fail:'tokenBoundAccount'}).client,owner,friend),/RPC unavailable/);
});
test('wrong chain and network changes during verification cannot enter',async()=>{
  await assert.rejects(verifyFriend(fixture({chain:1}).client,owner,friend),/Robinhood/);
  await assert.rejects(verifyFriend(fixture({networkChanges:true}).client,owner,friend),/network changed/);
});
