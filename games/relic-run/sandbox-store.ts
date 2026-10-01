import {isAddress,zeroAddress} from 'viem';
import {account,character,createEconomy,finishDeath,settleRound,validateEconomy,type Economy} from './economy.ts';

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
  for(const key of Object.keys(previous.accounts))if(key!==scope&&JSON.stringify(next.accounts[key])!==JSON.stringify(expected.accounts[key]))throw new Error('A session cannot modify another Friend’s progress.');
  const keys=Object.keys(next.accounts[scope].characters);
  if(keys.length!==1||keys[0]!==`generation:${friendId}`||next.accounts[scope].characters[keys[0]].kind!=='generation')throw new Error('The save does not belong to this Friend.');
  if(next.pool.closesAt<previous.pool.closesAt||next.entries<previous.entries||next.nextEntry<previous.nextEntry)throw new Error('Cannot replace progress with an older save.');
  return next;
}
