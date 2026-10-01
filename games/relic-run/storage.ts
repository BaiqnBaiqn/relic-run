import {gameStorage} from './persistence.ts';
import {createEconomy,account,character,validateEconomy,finishDeath,settleRound,totalRF,RF,type Economy} from './economy.ts';
import {EMPTY_LOADOUT,GEAR,SLOTS,gearFor} from './gear.ts';
export const SAVE_KEY='relic-run:world:v3';
const LEGACY='relic-run:level-one:v2:';
const whole=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
export function migrateLegacy(e:Economy,scope:string,raw:unknown,now:number){
  if(Object.hasOwn(e.accounts,scope))return;
  // Read-only compatibility with the retired v2 format: release all historical
  // balances once. These serialized keys are not a v3 earning mechanic.
  // Keep the original save untouched as a backup.
  const old=raw as {version?:number;rf:number;gemz:number;staked:number;slots:number;jackpot:number;ecosystem:number;stakingPool:number;stakingClaim:number;characters:Record<string,any>;active:any};
  if(old?.version!==2||[old.rf,old.gemz,old.staked,old.slots,old.jackpot,old.ecosystem,old.stakingPool,old.stakingClaim].some(n=>!whole(n))||!old.characters||old.stakingClaim>old.stakingPool)throw new Error('The old save could not be imported. Its backup has been kept.');
  const before=totalRF(e),p=account(e,scope);p.rf+=old.rf+old.stakingClaim;p.gemz=old.gemz+old.staked;p.migrated=true;
  e.pool.rf+=old.slots+old.stakingPool-old.stakingClaim;e.jackpots[1]+=old.jackpot;e.ecosystem+=old.ecosystem;e.gemzMinted+=p.gemz;
  for(const [key,v] of Object.entries(old.characters)){
    if(!v||!['genesis','generation'].includes(v.kind)||!whole(v.lockedUntil)||!whole(v.clears)||!v.inventory||!v.loadout)throw new Error('An old character could not be imported.');
    const c=character(e,scope,key,v.kind);c.lockedUntil=v.lockedUntil;c.clears=v.clears;c.best=v.best;
    for(const [id,n] of Object.entries(v.inventory))if(GEAR.some(g=>g.id===Number(id))&&whole(n))c.inventory[Number(id)]=n;
    for(const slot of SLOTS){const id=v.loadout[slot];if(gearFor(id).id===id&&gearFor(id).slot===slot&&(id<=0||c.inventory[id]>0))c.loadout[slot]=id;}
    if(old.active&&!old.active.ended&&old.active.friend===key&&c.kind!=='genesis'){
      for(const slot of SLOTS){const id=c.loadout[slot];if(id>0)c.inventory[id]=Math.max(0,c.inventory[id]-1);}
      c.loadout={...EMPTY_LOADOUT};c.lockedUntil=now+12*60*60*1000;
    }
  }
  // The new model grants 500 demo RF once, independently of imported balances.
  e.seedRF+=totalRF(e)-before-500*RF;
}
export function loadSave(scope:string):Economy{
  const raw=gameStorage().getItem(SAVE_KEY),value=raw?JSON.parse(raw):createEconomy();
  if(!validateEconomy(value))throw new Error('The shared local save is invalid. A backup is retained when resetting.');
  settleRound(value,Date.now());
  if(!Object.hasOwn(value.accounts,scope)){
    const old=gameStorage().getItem(LEGACY+scope);
    if(old)migrateLegacy(value,scope,JSON.parse(old),Date.now());else account(value,scope);
  }
  if(!validateEconomy(value))throw new Error('Save migration failed. Your original save is unchanged.');
  return value;
}
export function save(_scope:string,value:Economy){if(!validateEconomy(value))throw new Error('Save validation failed.');gameStorage().setItem(SAVE_KEY,JSON.stringify(value));}
export function recoverAbandoned(value:Economy,scope:string,now:number){const a=value.accounts[scope]?.active;if(a&&!a.ended)finishDeath(value,scope,a.id,now);}
export function resetSave(scope:string){
  const previous=gameStorage().getItem(SAVE_KEY);if(previous)gameStorage().setItem(SAVE_KEY+':backup:'+Date.now(),previous);
  // A reset opens a fresh simulated world; legacy data is preserved but not reimported.
  const e=createEconomy();account(e,scope);gameStorage().setItem(SAVE_KEY,JSON.stringify(e));
}
