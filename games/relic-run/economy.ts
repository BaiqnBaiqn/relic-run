import {EMPTY_LOADOUT,GEAR,SLOTS,gearFor,bossWeaponDrops,chestLoot,type Loadout} from './gear.ts';
import {EMPTY_POINTS,STATS,STAT_CAP,POTION_CAP,potionDrinks,POTIONS,potionForLevel,type StatPoints,type PotionId} from './potions.ts';
import {levelFor,LEVELS,gemzDrop,type LevelId} from './levels.ts';
import {addGemzQuarters} from './gemz.ts';
import {FORTUNE_FANG_ID,FORTUNE_BONUS_BPS} from './soulbound.ts';
import {entryQuote,fortuneChanceBps} from './entry.ts';
import {chestFor,BASE_CHEST,type ChestId} from './chests.ts';

// Integer micro-RF; one shared local world with separate account purses.
export const RF=1_000_000,LOCKOUT_MS=12*60*60*1000,ROUND_MS=24*60*60*1000,CHEST_COST=BASE_CHEST.cost;
export const LEVEL_ONE={id:1,name:'The Overgrowth',boss:'The Hollow Warden',entry:100*RF,monsterGemz:3,bossGemz:67,minions:11,jackpotChanceBps:25} as const;
export const ENTRY_SPLIT={redemption:8000,jackpot:1500,ecosystem:500} as const;
export function entryAllocation(cost:number){
  if(!Number.isSafeInteger(cost)||cost<=0)throw new Error('Invalid entry cost.');
  const redemption=Number(BigInt(cost)*BigInt(ENTRY_SPLIT.redemption)/10000n);
  const jackpot=Number(BigInt(cost)*BigInt(ENTRY_SPLIT.jackpot)/10000n);
  return {redemption,jackpot,ecosystem:cost-redemption-jackpot};
}
export {CHEST_ODDS} from './gear.ts';
export type CharacterKind='generation'|'genesis';
export type Character={kind:CharacterKind;inventory:Record<number,number>;loadout:Loadout;lockedUntil:number;clears:number;best:number|null;points:StatPoints;drinks?:StatPoints;potions:Partial<Record<PotionId,string>>};
export type Entry={id:number;level:number;multiple?:number;costRF?:number;gemzBonusBps?:number;friend:string;kills:number[];bossClaimed:boolean;ended:boolean;gemz:number;gemzFraction?:number;items:number[];potions:PotionId[];jackpot:number|null};
export type ChestReceipt={number:number;chest:ChestId;item:number;friend:string;revealed:boolean};
export type Purse={rf:number;gemz:number;gemzFraction?:number;characters:Record<string,Character>;active:Entry|null;chests:number;lastChest:number|null;chestReceipt?:ChestReceipt;migrated:boolean};
export type Settlement={round:number;rf:number;gemz:number;payouts:Record<string,number>;startedAt?:number;endedAt?:number};
export type Economy={version:3;seedRF:number;accounts:Record<string,Purse>;pool:{rf:number;round:number;closesAt:number;contributions:Record<string,number>;last:Settlement|null;history?:Settlement[]};jackpots:Record<number,number>;ecosystem:number;entries:number;nextEntry:number;gemzMinted:number;gemzMintedFraction?:number;gemzBurned:number;redemptionPaid:number;jackpotPaid:number};
export const fmtRF=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:4}).format(value/RF);
const nextClose=(now:number)=>(Math.floor(now/ROUND_MS)+1)*ROUND_MS;
const fraction=(n:unknown)=>n===undefined||(Number.isInteger(n)&&Number(n)>=0&&Number(n)<4);
const whole=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
export function createEconomy(now=Date.now()):Economy{return {version:3,seedRF:0,accounts:{},pool:{rf:0,round:1,closesAt:nextClose(now),contributions:{},last:null},jackpots:{1:0,2:0,3:0,4:0,5:0},ecosystem:0,entries:0,nextEntry:1,gemzMinted:0,gemzBurned:0,redemptionPaid:0,jackpotPaid:0};}
export function account(e:Economy,scope:string):Purse{
  if(!Object.hasOwn(e.accounts,scope)){
    e.accounts[scope]={rf:500*RF,gemz:0,characters:{},active:null,chests:0,lastChest:null,migrated:false};e.seedRF+=500*RF;
  }
  return e.accounts[scope];
}
export function character(e:Economy,scope:string,key:string,kind:CharacterKind='generation'):Character{
  const p=account(e,scope);
  return p.characters[key]??(p.characters[key]={kind,inventory:{},loadout:{...EMPTY_LOADOUT},lockedUntil:0,clears:0,best:null,points:{...EMPTY_POINTS},potions:{}});
}
function campOnly(p:Purse){if(p.active&&!p.active.ended)throw new Error('Return to camp first.');}
export function beginEntry(e:Economy,scope:string,key:string,now:number,levelId:LevelId=1,multiple=1){
  const level=levelFor(levelId),quote=entryQuote(levelId,multiple),cost=quote.costRF*RF;
  settleRound(e,now);const p=account(e,scope),c=character(e,scope,key);campOnly(p);
  if(c.lockedUntil>now)throw new Error('This Friend is recovering.');
  if(p.rf<cost)throw new Error(`You need ${quote.costRF.toLocaleString('en-US')} simulated RF to enter.`);
  const funding=entryAllocation(cost);
  p.rf-=cost;e.pool.rf+=funding.redemption;e.jackpots[level.id]+=funding.jackpot;e.ecosystem+=funding.ecosystem;e.entries++;
  p.active={id:e.nextEntry++,level:level.id,multiple,costRF:quote.costRF,gemzBonusBps:gearFor(c.loadout.weapon).gemzBonusBps??0,friend:key,kills:[],bossClaimed:false,ended:false,gemz:0,items:[],potions:[],jackpot:null};return p.active.id;
}
export type BossRolls={weapon:number;extraWeapons?:number[];fortune?:number;bonusPotion:number;size:number;stat:number;secondSize:number;secondStat:number;gemz:number};
export function creditKill(e:Economy,scope:string,entryId:number,enemyId:number,boss:boolean,rolls:BossRolls){
  const p=account(e,scope),a=p.active;if(!a||a.id!==entryId||a.ended||a.kills.includes(enemyId)||(boss&&a.bossClaimed))return;
  if(!Number.isSafeInteger(enemyId)||enemyId<1)throw new Error('Invalid defeated enemy.');
  const level=levelFor(a.level);
  if(boss&&a.kills.length!==level.minions)throw new Error('Clear the room and summoned minions first.');
  if(!boss&&a.kills.length>=level.minions)throw new Error('No more rewarded minions in this run.');
  const {extraWeapons,fortune,...singleRolls}=rolls;Object.values(singleRolls).forEach(validRoll);extraWeapons?.forEach(validRoll);if(fortune!==undefined)validRoll(fortune);
  const items=boss?bossWeaponDrops([rolls.weapon,...(extraWeapons??[])],level.id,a.multiple??1):[];
  if(boss&&(fortune??9999)<fortuneChanceBps(level.id,a.multiple??1))items.push(FORTUNE_FANG_ID);
  const c=character(e,scope,a.friend),baseGemz=gemzDrop(level,boss,rolls.gemz)*(a.multiple??1);
  const quarters=baseGemz*((a.gemzBonusBps??0)===FORTUNE_BONUS_BPS?5:4);
  a.kills.push(enemyId);addGemzQuarters(a,quarters);addGemzQuarters(p,quarters);
  const minted={gemz:e.gemzMinted,gemzFraction:e.gemzMintedFraction};addGemzQuarters(minted,quarters);
  e.gemzMinted=minted.gemz;e.gemzMintedFraction=minted.gemzFraction;
  if(boss){
    a.bossClaimed=true;
    for(const item of items){c.inventory[item]=(c.inventory[item]??0)+1;a.items.push(item);}
    const drops=[potionForLevel(a.level,rolls.size,rolls.stat)];
    if(rolls.bonusPotion<2000)drops.push(potionForLevel(a.level,rolls.secondSize,rolls.secondStat));
    for(const id of drops){c.potions[id]=(BigInt(c.potions[id]??'0')+1n).toString();a.potions.push(id);}
  }
  return quarters/4;
}
export function finishVictory(e:Economy,scope:string,entryId:number,time:number,jackpotRoll:number){
  validRoll(jackpotRoll);const p=account(e,scope),a=p.active;if(!a||a.id!==entryId||a.ended||!a.bossClaimed)return;
  const c=character(e,scope,a.friend);c.clears++;c.best=c.best===null?time:Math.min(c.best,time);a.jackpot=0;
  if(jackpotRoll<LEVEL_ONE.jackpotChanceBps){
    a.jackpot=Number(BigInt(e.jackpots[a.level])*80n/100n);e.jackpots[a.level]-=a.jackpot;p.rf+=a.jackpot;e.jackpotPaid+=a.jackpot;
    const weapon=levelFor(a.level).jackpotWeapon;c.inventory[weapon]=(c.inventory[weapon]??0)+1;a.items.push(weapon);
  }
  a.ended=true;
}
export function finishDeath(e:Economy,scope:string,entryId:number,now:number){
  const p=account(e,scope),a=p.active;if(!a||a.id!==entryId||a.ended)return;
  const c=character(e,scope,a.friend);c.points={...EMPTY_POINTS};c.drinks={...EMPTY_POINTS};
  if(c.kind!=='genesis'){
    for(const slot of SLOTS){const id=c.loadout[slot];if(id>0&&!gearFor(id).soulbound){c.inventory[id]=Math.max(0,(c.inventory[id]??0)-1);c.loadout[slot]=EMPTY_LOADOUT[slot];}}
    c.lockedUntil=now+LOCKOUT_MS;
  }
  a.ended=true;
}
export function equip(e:Economy,scope:string,key:string,id:number){
  campOnly(account(e,scope));const c=character(e,scope,key),item=gearFor(id);
  if(item.id!==id)throw new Error('Unknown item.');if(id>0&&!(c.inventory[id]>0))throw new Error('This Friend does not own that item.');c.loadout[item.slot]=id;
}
export function openChest(e:Economy,scope:string,key:string,tierRoll:number,slotRoll:number,typeRoll:number,chestId:ChestId='overgrowth'){
  const chest=chestFor(chestId),p=account(e,scope);campOnly(p);
  if(p.chestReceipt&&!p.chestReceipt.revealed)throw new Error('Reveal your saved chest before opening another.');
  const id=chestLoot(tierRoll,slotRoll,typeRoll,chestId);
  if(p.gemz<chest.cost)throw new Error(`You need ${chest.cost.toLocaleString('en-US')} GEMZ to open this chest.`);
  const c=character(e,scope,key);p.gemz-=chest.cost;e.gemzBurned+=chest.cost;c.inventory[id]=(c.inventory[id]??0)+1;p.chests++;p.lastChest=id;
  p.chestReceipt={number:p.chests,chest:chestId,item:id,friend:key,revealed:false};return id;
}
export function revealChest(e:Economy,scope:string,number:number){const receipt=account(e,scope).chestReceipt;if(receipt?.number===number)receipt.revealed=true;}
export function consumePotion(e:Economy,scope:string,key:string,id:PotionId){
  const p=account(e,scope);campOnly(p);const c=character(e,scope,key),potion=POTIONS.find(v=>v.id===id);
  if(!potion||BigInt(c.potions[id]??'0')<1n)throw new Error('No potion of that type stored.');
  if(potionDrinks(c)[potion.stat]>=POTION_CAP)throw new Error('This stat has reached 20 potions this life. It has not been consumed.');
  c.drinks={...potionDrinks(c)};c.drinks[potion.stat]++;
  c.potions[id]=(BigInt(c.potions[id]!)-1n).toString();c.points[potion.stat]+=potion.points;
}
export const totalContributed=(e:Economy)=>Object.values(e.pool.contributions).reduce((n,v)=>n+v,0);
// An estimate of this season only, including the proposed contribution in the denominator.
export function redemptionPreview(e:Economy,scope:string,additional=0){
  if(!whole(additional))throw new Error('Invalid GEMZ preview.');
  const mine=(e.pool.contributions[scope]??0)+additional,total=totalContributed(e)+additional;
  return {mine,total,share:total?mine/total:0,rf:total?Number(BigInt(e.pool.rf)*BigInt(mine)/BigInt(total)):0};
}
export function contribute(e:Economy,scope:string,amount:number,now:number){
  settleRound(e,now);const p=account(e,scope);campOnly(p);
  if(!Number.isSafeInteger(amount)||amount<=0||amount>p.gemz)throw new Error('Enter an available whole amount of GEMZ.');
  if(!e.pool.rf)throw new Error('The RF pool is empty. Your GEMZ have not been spent.');
  p.gemz-=amount;e.pool.contributions[scope]=(e.pool.contributions[scope]??0)+amount;
}
export function settleRound(e:Economy,now:number){
  if(now<e.pool.closesAt)return false;
  const endedAt=e.pool.closesAt,elapsedSeasons=Math.floor((now-endedAt)/ROUND_MS)+1;
  const total=totalContributed(e),fund=e.pool.rf;
  if(total){
    // BigInt intermediates and largest remainders distribute every micro-RF exactly.
    const rows=Object.entries(e.pool.contributions).map(([scope,amount])=>{const n=BigInt(fund)*BigInt(amount);return {scope,paid:Number(n/BigInt(total)),remainder:n%BigInt(total)};});
    rows.sort((a,b)=>a.remainder===b.remainder?a.scope.localeCompare(b.scope):a.remainder>b.remainder?-1:1);
    let dust=fund-rows.reduce((n,row)=>n+row.paid,0);for(const row of rows)if(dust>0){row.paid++;dust--;}
    const payouts:Record<string,number>={};for(const row of rows){e.accounts[row.scope].rf+=row.paid;payouts[row.scope]=row.paid;}
    const result:Settlement={round:e.pool.round,rf:fund,gemz:total,payouts,startedAt:endedAt-ROUND_MS,endedAt};
    e.pool.history=[...(e.pool.history??(e.pool.last?[e.pool.last]:[])),result].slice(-30);e.pool.last=result;e.pool.rf=0;e.pool.contributions={};e.gemzBurned+=total;e.redemptionPaid+=fund;
  }
  e.pool.round+=elapsedSeasons;e.pool.closesAt=nextClose(now);return true;
}
export function addTestRF(e:Economy,scope:string,amount=100){if(!Number.isSafeInteger(amount)||amount<1||amount>50_000_000)throw new Error('Invalid test RF grant.');campOnly(account(e,scope));e.accounts[scope].rf+=amount*RF;e.seedRF+=amount*RF;}
export function validRoll(roll:number){if(!Number.isInteger(roll)||roll<0||roll>=10000)throw new RangeError('Roll must be 0–9999.');}
export function draw(size=10000){if(!Number.isSafeInteger(size)||size<1||size>2**32)throw new RangeError('Invalid draw size.');const a=new Uint32Array(1),limit=Math.floor(2**32/size)*size;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%size;}
export const drawBossRolls=():BossRolls=>({weapon:draw(),extraWeapons:[draw(),draw(),draw(),draw()],fortune:draw(),bonusPotion:draw(),size:draw(),stat:draw(),secondSize:draw(),secondStat:draw(),gemz:draw()});
export function totalRF(e:Economy){return Object.values(e.accounts).reduce((n,p)=>n+p.rf,0)+e.pool.rf+Object.values(e.jackpots).reduce((n,v)=>n+v,0)+e.ecosystem;}
export function validateEconomy(value:unknown):value is Economy{
  try{
    const e=value as Economy;if(e.version!==3||!e.accounts||!e.pool||!e.jackpots||e.nextEntry<1)return false;
    if([e.seedRF,e.pool.rf,e.pool.round,e.pool.closesAt,e.ecosystem,e.entries,e.nextEntry,e.gemzMinted,e.gemzBurned,e.redemptionPaid,e.jackpotPaid,...Object.values(e.jackpots)].some(n=>!whole(n)))return false;
    if([1,2,3,4,5].some(id=>!whole(e.jackpots[id]))||!fraction(e.gemzMintedFraction))return false;
    if(e.pool.last){const last=e.pool.last;if(!whole(last.round)||last.round>=e.pool.round||!whole(last.rf)||!whole(last.gemz)||last.gemz===0||!last.payouts||Object.entries(last.payouts).some(([scope,n])=>!Object.hasOwn(e.accounts,scope)||!whole(n))||Object.values(last.payouts).reduce((n,v)=>n+v,0)!==last.rf)return false;}
    if(e.pool.history!==undefined){
      if(!Array.isArray(e.pool.history)||e.pool.history.length>30)return false;
      let previous=0;
      for(const row of e.pool.history){
        if(!whole(row.round)||row.round<=previous||row.round>=e.pool.round||!whole(row.rf)||!whole(row.gemz)||row.gemz===0||!row.payouts)return false;
        if(Object.entries(row.payouts).some(([scope,n])=>!Object.hasOwn(e.accounts,scope)||!whole(n))||Object.values(row.payouts).reduce((a,b)=>a+b,0)!==row.rf)return false;
        if((row.startedAt!==undefined||row.endedAt!==undefined)&&(!whole(row.startedAt)||!whole(row.endedAt)||row.endedAt-row.startedAt!==ROUND_MS))return false;
        previous=row.round;
      }
    }
    for(const [scope,n] of Object.entries(e.pool.contributions))if(!Object.hasOwn(e.accounts,scope)||!whole(n)||n===0)return false;
    for(const p of Object.values(e.accounts)){
      if(!whole(p.rf)||!whole(p.gemz)||!fraction(p.gemzFraction)||!whole(p.chests)||!p.characters||!(p.lastChest===null||GEAR.some(g=>g.id===p.lastChest&&!g.soulbound)))return false;
      if(p.chestReceipt){const r=p.chestReceipt,g=gearFor(r.item);if(!whole(r.number)||r.number===0||r.number!==p.chests||r.item!==p.lastChest||!p.characters[r.friend]||typeof r.revealed!=='boolean'||g.soulbound||!chestFor(r.chest).odds.some(o=>o.tier===g.tier&&o.chancePpm>0))return false;}
      for(const c of Object.values(p.characters)){
        if(!['genesis','generation'].includes(c.kind)||!whole(c.lockedUntil)||!whole(c.clears)||!(c.best===null||(Number.isFinite(c.best)&&c.best>=0)))return false;
        if(STATS.some(s=>!whole(c.points[s])||c.points[s]>STAT_CAP))return false;
        if(STATS.some(s=>{const count=potionDrinks(c)[s];return !whole(count)||count>POTION_CAP||c.points[s]<count||c.points[s]>count*2;}))return false;
        if(Object.entries(c.potions).some(([id,count])=>!POTIONS.some(p=>p.id===id)||typeof count!=='string'||!/^(0|[1-9]\d*)$/.test(count)))return false;
        if(Object.entries(c.inventory).some(([id,n])=>!GEAR.some(g=>g.id===Number(id))||!whole(n)))return false;
        if(SLOTS.some(slot=>gearFor(c.loadout[slot]).id!==c.loadout[slot]||gearFor(c.loadout[slot]).slot!==slot||(c.loadout[slot]>0&&!(c.inventory[c.loadout[slot]]>0))))return false;
      }
      if(p.active){const a=p.active;entryQuote(a.level as LevelId,a.multiple??1,a.gemzBonusBps??0);if(a.costRF!==undefined&&(!whole(a.costRF)||a.costRF===0))return false;if(!whole(a.id)||!p.characters[a.friend]||!LEVELS.some(l=>l.id===a.level)||!whole(a.gemz)||!fraction(a.gemzFraction)||!Array.isArray(a.kills)||new Set(a.kills).size!==a.kills.length||a.kills.some(id=>!whole(id)||id===0)||a.kills.length>12||!Array.isArray(a.items)||a.items.some(id=>!GEAR.some(g=>g.id===id))||!Array.isArray(a.potions)||a.potions.some(id=>!POTIONS.some(p=>p.id===id))||typeof a.ended!=='boolean'||typeof a.bossClaimed!=='boolean'||!(a.jackpot===null||whole(a.jackpot)))return false;}
    }
    return totalRF(e)===e.seedRF&&Object.values(e.accounts).reduce((n,p)=>n+BigInt(p.gemz)*4n+BigInt(p.gemzFraction??0),0n)+BigInt(totalContributed(e)+e.gemzBurned)*4n===BigInt(e.gemzMinted)*4n+BigInt(e.gemzMintedFraction??0);
  }catch{return false;}
}
