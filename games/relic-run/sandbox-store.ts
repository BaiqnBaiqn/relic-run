import {isAddress,zeroAddress} from 'viem';
import {account,character,createEconomy,finishDeath,settleRound,validateEconomy,entryAllocation,RF,type Economy} from './economy.ts';
import {entryQuote} from './entry.ts';
import type {LevelId} from './levels.ts';

export const SANDBOX_SAVE_KEY='relic-run:sandbox:v1';
export const SANDBOX_LOCK='relic-run:sandbox:writer';
export const MUTED_KEY='relic-run:muted';
export const canonicalScope=(wallet:string)=>{
  if(!isAddress(wallet)||wallet.toLowerCase()===zeroAddress)throw new Error('Invalid Friend wallet.');
  return `friend:4663:${wallet.toLowerCase()}`;
};
export function prepareWorld(raw:string|null,scope:string,friendId:bigint,now:number):Economy{
  const world=raw?JSON.parse(raw):createEconomy(now);
  if(!validateEconomy(world))throw new Error('Your saved world could not be read. The original has been preserved.');
  settleRound(world,now);account(world,scope);character(world,scope,`generation:${friendId}`);
  endAbandoned(world,scope,now);return world;
}
export function endAbandoned(world:Economy,scope:string,now:number){
  const active=world.accounts[scope]?.active;
  if(active&&!active.ended)finishDeath(world,scope,active.id,now);
}
/** Saves are preview records. This does not authenticate combat or create real RF. */
export function validateSessionSave(previous:Economy,raw:string,scope:string,friendId:bigint,now:number):Economy{
  if(typeof raw!=='string'||raw.length>8_000_000)throw new Error('The preview save is too large.');
  const next=JSON.parse(raw);
  if(!validateEconomy(next))throw new Error('The preview save failed validation.');
  if(JSON.stringify(Object.keys(next.accounts).sort())!==JSON.stringify(Object.keys(previous.accounts).sort()))throw new Error('A session cannot create or remove other accounts.');
  const expected=structuredClone(previous);
  if(next.pool.round!==previous.pool.round){settleRound(expected,now);if(next.pool.round!==expected.pool.round)throw new Error('Invalid season transition.');}
  if(next.pool.closesAt!==expected.pool.closesAt||JSON.stringify(next.pool.last)!==JSON.stringify(expected.pool.last)||JSON.stringify(next.pool.history)!==JSON.stringify(expected.pool.history)||next.redemptionPaid!==expected.redemptionPaid)throw new Error('Cannot rewrite season dates or settlements.');
  for(const key of Object.keys(previous.accounts))if(key!==scope&&JSON.stringify(next.accounts[key])!==JSON.stringify(expected.accounts[key]))throw new Error('A session cannot modify another Friend’s progress.');
  const contributors=new Set([...Object.keys(expected.pool.contributions),...Object.keys(next.pool.contributions)]);
  for(const key of contributors)if(key!==scope&&next.pool.contributions[key]!==expected.pool.contributions[key])throw new Error('Cannot change another Friend’s season contribution.');
  if((next.pool.contributions[scope]??0)<(expected.pool.contributions[scope]??0))throw new Error('Season contributions cannot be withdrawn.');
  const keys=Object.keys(next.accounts[scope].characters);
  if(keys.length!==1||keys[0]!==`generation:${friendId}`||next.accounts[scope].characters[keys[0]].kind!=='generation')throw new Error('The save does not belong to this Friend.');

  // Protect shared RF from arbitrary full-world patches. This validates ledger
  // transitions, not the truth of browser-reported combat or random outcomes.
  const before=expected.accounts[scope],after=next.accounts[scope],started=next.entries-expected.entries;
  if(![0,1].includes(started)||next.nextEntry-expected.nextEntry!==started)throw new Error('Invalid expedition sequence.');
  let cost=0,level=0;
  const pots={...expected.jackpots};
  if(started){
    const entry=after.active;
    if(!entry||entry.id!==expected.nextEntry||entry.friend!==`generation:${friendId}`||(before.active&&!before.active.ended)||before.characters[keys[0]].lockedUntil>now)throw new Error('Invalid expedition start.');
    cost=entryQuote(entry.level as LevelId,entry.multiple??1).costRF*RF;level=entry.level;
    if(entry.costRF!==cost/RF||before.rf<cost)throw new Error('Invalid entry payment.');
    pots[level]+=entryAllocation(cost).jackpot;
  }else if(after.active?.id!==before.active?.id)throw new Error('Cannot replace an expedition.');
  const payout=next.jackpotPaid-expected.jackpotPaid;
  if(payout<0)throw new Error('Cannot reverse jackpot history.');
  if(payout){
    const entry=after.active;
    if(started||!entry||!before.active||before.active.ended||!entry.ended||!entry.bossClaimed||entry.kills.length!==12||entry.level!==before.active.level||entry.jackpot!==payout||payout!==Number(BigInt(pots[entry.level])*80n/100n))throw new Error('Invalid jackpot payout.');
    pots[entry.level]-=payout;
  }
  const allocation=cost?entryAllocation(cost):{redemption:0,jackpot:0,ecosystem:0};
  if(next.pool.rf!==expected.pool.rf+allocation.redemption||next.ecosystem!==expected.ecosystem+allocation.ecosystem||JSON.stringify(next.jackpots)!==JSON.stringify(pots))throw new Error('Cannot divert shared RF reserves.');
  const grant=next.seedRF-expected.seedRF;
  if(grant<0||grant%RF!==0||grant>50_000_000*RF||(grant&&((before.active&&!before.active.ended)||(after.active&&!after.active.ended))))throw new Error('Invalid simulated RF grant.');
  if(after.rf!==before.rf+grant-cost+payout)throw new Error('Invalid Friend RF balance.');
  return next;
}
