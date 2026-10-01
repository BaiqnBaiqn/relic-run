import {EMPTY_POINTS,type StatPoints} from './potions.ts';
import {LEVELS,levelFor} from './levels.ts';
import {SOULBOUND_COLLECTIONS,FORTUNE_FANG_ID,FORTUNE_BONUS_BPS,type WeaponPerk} from './soulbound.ts';
import {entryQuote} from './entry.ts';
import {BASE_CHEST,chestTier,type ChestId} from './chests.ts';
export type Slot = 'weapon' | 'ability' | 'armor' | 'ring';
export type Family = 'wand' | 'bow' | 'sword' | 'dagger' | 'bolt' | 'fan' | 'orbit';
export type Rarity = 'Starter' | 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Boss' | 'Jackpot';
export type Ability = 'dash' | 'shield' | 'bash' | 'pulse' | 'heal' | 'ward';
export type ItemType = 'wand'|'bow'|'sword'|'dagger'|'dash'|'shield'|'bash'|'heal'|'robe'|'light'|'heavy'|'health'|'attack'|'dexterity'|'speed';
export type Gear = {id:number;name:string;slot:Slot;rarity:Rarity;detail:string;family?:Family;tier?:number;soulbound?:boolean;
  power?:number;health?:number;defense?:number;speed?:number;cooldown?:number;ability?:Ability;strength?:number;
  itemType?:ItemType;legacy?:boolean;dexterity?:number;abilityHaste?:number;range?:number;perk?:WeaponPerk;collection?:string;gemzBonusBps?:number};
export type Loadout = Record<Slot,number>;
export const SLOTS:Slot[]=['weapon','ability','armor','ring'];
export const RARITIES:Rarity[]=['Common','Uncommon','Rare','Epic','Legendary'];
export const TIERS=[1,2,3,4,5] as const;
export const CHEST_ODDS=BASE_CHEST.odds;
export const ITEM_TYPES:{type:ItemType;slot:Slot;label:string}[]=[
  {type:'wand',slot:'weapon',label:'Wands'},{type:'bow',slot:'weapon',label:'Bows'},
  {type:'sword',slot:'weapon',label:'Swords'},{type:'dagger',slot:'weapon',label:'Daggers'},
  {type:'dash',slot:'ability',label:'Dash'},{type:'shield',slot:'ability',label:'Shield'},
  {type:'bash',slot:'ability',label:'Bash'},{type:'heal',slot:'ability',label:'Heal'},
  {type:'robe',slot:'armor',label:'Robes'},{type:'light',slot:'armor',label:'Light armor'},
  {type:'heavy',slot:'armor',label:'Heavy armor'},{type:'health',slot:'ring',label:'Health rings'},
  {type:'attack',slot:'ring',label:'Attack rings'},{type:'dexterity',slot:'ring',label:'Dexterity rings'},
  {type:'speed',slot:'ring',label:'Speed rings'},
];
export type WeaponProfile={damage:number;interval:number;range:number;speed:number;radius:number;shots:number;arc:number};
export const WEAPON_PROFILES:Record<'wand'|'bow'|'sword'|'dagger',WeaponProfile>={
  wand:{damage:32,interval:.9,range:440,speed:360,radius:8,shots:1,arc:0},
  bow:{damage:16,interval:.65,range:330,speed:465,radius:3,shots:2,arc:0},
  sword:{damage:55,interval:1,range:100,speed:0,radius:0,shots:0,arc:110},
  dagger:{damage:15,interval:.24,range:75,speed:0,radius:0,shots:0,arc:80},
};
export function weaponProfile(g:Gear):WeaponProfile{
  if(g.id===0)return {...WEAPON_PROFILES.wand,damage:24};
  if(g.family&&g.family in WEAPON_PROFILES)return WEAPON_PROFILES[g.family as keyof typeof WEAPON_PROFILES];
  return {damage:12,interval:g.family==='orbit'?.6:.43,range:330,speed:340,radius:4,shots:g.family==='fan'?3:1,arc:0};
}
export const STARTERS:Gear[]=[
  {id:0,name:'Weathered wand',slot:'weapon',rarity:'Starter',family:'wand',power:1,detail:'24 damage · 440 range · one large bolt every 0.9s.'},
  {id:-1,name:'Faded rune',slot:'ability',rarity:'Starter',ability:'pulse',strength:18,cooldown:12,detail:'Q: a small pulse deals 18 damage to nearby foes. 12s cooldown.'},
  {id:-2,name:'Linen tunic',slot:'armor',rarity:'Starter',detail:'A simple tunic. No defense bonus.'},
  {id:-3,name:'Twine ring',slot:'ring',rarity:'Starter',detail:'A humble beginning. No stat bonus.'},
];
export const STARTER=STARTERS[0];
export const EMPTY_LOADOUT:Loadout={weapon:0,ability:-1,armor:-2,ring:-3};
const chestItems:Gear[]=[
  {id:1,name:'Moss wand',slot:'weapon',rarity:'Common',family:'bolt',power:1.1,detail:'Piercing bolts. +10% weapon damage.'},
  {id:2,name:'Briar bow',slot:'weapon',rarity:'Uncommon',family:'fan',power:1.2,detail:'Three spreading thorns. +20% weapon power.'},
  {id:3,name:'Warden’s thorn',slot:'weapon',rarity:'Rare',family:'bolt',power:1.4,detail:'The Warden’s piercing branch. +40% weapon damage.'},
  {id:4,name:'Spore rune',slot:'ability',rarity:'Common',ability:'pulse',strength:32,cooldown:9,detail:'Q: pulse for 32 damage to nearby foes. 9s cooldown.'},
  {id:5,name:'Seedheart charm',slot:'ability',rarity:'Uncommon',ability:'heal',strength:24,cooldown:11,detail:'Q: recover 24 HP. 11s cooldown.'},
  {id:6,name:'Warden’s sigil',slot:'ability',rarity:'Rare',ability:'ward',strength:2.5,cooldown:10,detail:'Q: block all damage for 2.5 seconds. 10s cooldown.'},
  {id:7,name:'Woven bark',slot:'armor',rarity:'Common',health:15,defense:1,detail:'+15 maximum HP. Reduce each hit by 1.'},
  {id:8,name:'Bramble mail',slot:'armor',rarity:'Uncommon',health:25,defense:2,speed:-4,detail:' +25 HP, 2 defense. Slightly slower movement.'},
  {id:9,name:'Warden’s mantle',slot:'armor',rarity:'Rare',health:35,defense:3,detail:'+35 maximum HP. Reduce each hit by 3.'},
  {id:10,name:'Dewdrop ring',slot:'ring',rarity:'Common',health:10,detail:'+10 maximum HP.'},
  {id:11,name:'Windseed ring',slot:'ring',rarity:'Uncommon',speed:12,cooldown:.1,detail:'+12 movement speed. Ability cooldown is 10% shorter.'},
  {id:12,name:'Hollow crown',slot:'ring',rarity:'Rare',power:.08,health:15,detail:'+8% weapon damage and +15 maximum HP.'},
];
// Retain historical IDs and behavior so existing saves never lose equipment.
export const LEGACY_GEAR:Gear[]=chestItems.map(g=>({...g,legacy:true,tier:g.rarity==='Common'?1:g.rarity==='Uncommon'?2:3}));
const itemNames:Record<ItemType,string[]>={
  wand:['Twig wand','Root wand','Briar wand','Elder wand','Heartwood wand'],
  bow:['Reed bow','Willow bow','Bramble bow','Moonwood bow','Worldtree bow'],
  sword:['Rustblade','Ironleaf sword','Briar greatsword','Elder cleaver','Crownfall blade'],
  dagger:['Flint dagger','Leafknife','Thornfang','Nightbriar dagger','Ghostpetal blade'],
  dash:['Flicker rune','Windstep rune','Gale rune','Stormstep rune','Horizon rune'],
  shield:['Pebble ward','Bark ward','Thorn ward','Ironroot ward','Ancient ward'],
  bash:['Knuckle sigil','Ram sigil','Quake sigil','Ruin sigil','Cataclysm sigil'],
  heal:['Dew charm','Sprout charm','Bloom charm','Lifebloom charm','Evergreen charm'],
  robe:['Threadbare robes','Mossweave robes','Grovekeeper robes','Moonweave robes','Elderweave robes'],
  light:['Hide vest','Leafscale jacket','Thornhide armor','Shadowleaf armor','Wildheart armor'],
  heavy:['Scrap plate','Barksteel plate','Ironroot plate','Stoneheart plate','Worldroot plate'],
  health:['Vitality band','Vitality ring','Vitality seal','Vitality crest','Vitality crown'],
  attack:['Might band','Might ring','Might seal','Might crest','Might crown'],
  dexterity:['Precision band','Precision ring','Precision seal','Precision crest','Precision crown'],
  speed:['Swiftness band','Swiftness ring','Swiftness seal','Swiftness crest','Swiftness crown'],
};
const damageScale=[1.8,2.65,3.7,5,6.5];
export const CHEST_GEAR:Gear[]=ITEM_TYPES.flatMap(({type,slot},index)=>TIERS.map(tier=>{
  const i=tier-1,g:Gear={id:200+index*10+tier,name:itemNames[type][i],slot,rarity:RARITIES[i],tier,itemType:type,detail:''};
  if(slot==='weapon'){
    g.family=type as Family;g.power=damageScale[i];const w=weaponProfile(g),damage=Number((w.damage*g.power).toFixed(2));
    g.detail=type==='wand'?`${damage} damage · ${w.range} range · one large bolt every ${w.interval}s.`:
      type==='bow'?`${damage} damage per arrow · ${w.range} range · two arrows every ${w.interval}s.`:
      `${damage} damage · ${w.range} range · one ${w.arc}° swipe every ${w.interval}s.`;
  }else if(slot==='ability'){
    g.ability=type as Ability;
    if(type==='dash'){g.strength=150+i*20;g.cooldown=9-i;g.detail=`Dash ${g.strength} units forward in 0.2s. ${g.cooldown}s cooldown.`;}
    if(type==='shield'){g.strength=1;g.cooldown=18-i*2;g.detail=`Block the next hit. Lasts until hit; does not stack. ${g.cooldown}s cooldown.`;}
    if(type==='bash'){g.strength=[180,300,470,700,1000][i];g.range=155+i*10;g.cooldown=12-i;g.detail=`${g.strength} damage in a forward 120° arc · ${g.range} range. ${g.cooldown}s cooldown.`;}
    if(type==='heal'){g.strength=[15,30,50,75,105][i];g.cooldown=12-i;g.detail=`Recover ${g.strength} HP. ${g.cooldown}s cooldown.`;}
  }else if(slot==='armor'){
    if(type==='robe'){g.health=[15,30,50,75,105][i];g.defense=[0,1,1,2,2][i];g.abilityHaste=.08*tier;g.detail=`+${g.health} HP · ${g.defense} defense · ability cooldowns ${8*tier}% shorter.`;}
    if(type==='light'){g.health=[25,45,70,100,140][i];g.defense=tier;g.speed=5+tier*5;g.detail=`+${g.health} HP · ${g.defense} defense · +${g.speed} movement speed.`;}
    if(type==='heavy'){g.health=[40,70,105,145,195][i];g.defense=tier+1;g.speed=-12;g.detail=`+${g.health} HP · ${g.defense} defense · −12 movement speed.`;}
  }else{
    if(type==='health'){g.health=tier*20;g.detail=`+${g.health} maximum HP.`;}
    if(type==='attack'){g.power=tier*.15;g.detail=`+${tier*15}% weapon and Bash damage.`;}
    if(type==='dexterity'){g.dexterity=tier*.15;g.detail=`+${tier*15}% weapon attack rate.`;}
    if(type==='speed'){g.speed=tier*15;g.detail=`+${g.speed} movement speed.`;}
  }
  return g;
}));
const historicalBossGear:Gear[]=[
  {id:101,name:'Thorncaster',slot:'weapon',rarity:'Boss',soulbound:true,family:'bolt',power:2.6,detail:'Piercing bolts with +160% power. Bound to this Friend; survives death.'},
  {id:102,name:'Briar repeater',slot:'weapon',rarity:'Boss',soulbound:true,family:'fan',power:2.6,detail:'A three-thorn fan with +160% power. Bound to this Friend; survives death.'},
  {id:103,name:'Hollow sickle',slot:'weapon',rarity:'Boss',soulbound:true,family:'orbit',power:2,detail:'Orbiting blades and ranged bolts. Bound to this Friend; survives death.'},
  {id:104,name:'Heartwood scepter',slot:'weapon',rarity:'Jackpot',soulbound:true,family:'bolt',power:3.3,detail:'Piercing bolts with +230% power. The Warden’s jackpot exclusive; survives death.'},
];
for(const level of LEVELS.filter(l=>l.id>1)){
  const families:Family[][]=[['bow','wand','sword'],['dagger','wand','bow'],['sword','dagger','bow'],['wand','bow','dagger']];
  const power=[2.9,4.1,5.5,7.1][level.id-2];
  const names=[['Tideline Bow','Brine Wand','Barnacle Blade'],['Glassneedle Dagger','Prismbranch Wand','Shardstring Bow'],['Ashfall Sword','Cinderfang Dagger','Emberwood Bow'],['Comet Wand','Orbit Bow','Nightfall Dagger']][level.id-2];
  names.forEach((name,i)=>historicalBossGear.push({id:111+(level.id-2)*10+i,name,slot:'weapon',rarity:'Boss',soulbound:true,family:families[level.id-2][i],power,detail:`L${level.id} soulbound weapon · +${Math.round((power-1)*100)}% power. Bound to this Friend; survives death.`}));
  historicalBossGear.push({id:level.jackpotWeapon,name:level.jackpot,slot:'weapon',rarity:'Jackpot',soulbound:true,family:level.id===3?'wand':'sword',power:power+.2,detail:`L${level.id} jackpot exclusive · +${Math.round((power-.8)*100)}% power. Bound to this Friend; survives death.`});
}
export const COLLECTION_GEAR:Gear[]=SOULBOUND_COLLECTIONS.flatMap(c=>c.items.map(g=>({
  ...g,slot:'weapon',rarity:'Boss',soulbound:true,tier:c.level,collection:c.name,power:damageScale[c.level-1]*.9,
  detail:`${Number((WEAPON_PROFILES[g.family].damage*damageScale[c.level-1]*.9).toFixed(2))} damage${g.family==='bow'?' per arrow':''} · ${WEAPON_PROFILES[g.family].interval}s attack interval. ${c.name} collection · ${g.effect} Bound to this Friend; survives death.`,
})));
export const FORTUNE_FANG:Gear={id:FORTUNE_FANG_ID,name:'Fortune’s Fang',slot:'weapon',rarity:'Boss',soulbound:true,tier:5,family:'dagger',power:damageScale[4]*.9,collection:'Starbound',gemzBonusBps:FORTUNE_BONUS_BPS,
  detail:'87.75 damage · 0.24s attack interval. L5 exclusive · +25% GEMZ from every kill while equipped, multiplied after the entry boost. Applies from your next run; survives death. Independent 0.25% base drop chance, boosted by entry.'};
export const BOSS_GEAR:Gear[]=[...historicalBossGear.map(g=>({...g,legacy:g.rarity!=='Jackpot'})),...COLLECTION_GEAR,FORTUNE_FANG];
export const GEAR:Gear[]=[...CHEST_GEAR,...BOSS_GEAR,...LEGACY_GEAR];
export const gearFor=(id:number):Gear=>[...STARTERS,...GEAR].find(g=>g.id===id)??STARTER;
export const gearLabel=(g:Gear)=>g.soulbound?`${g.legacy?'Legacy boss':g.rarity}${g.tier?` · L${g.tier}`:''} · Soulbound`:g.tier?`T${g.tier}${g.legacy?' · Legacy':''}`:'Starter';
export function statsFor(loadout:Loadout,points:StatPoints=EMPTY_POINTS){
  const weapon=gearFor(loadout.weapon),ability=gearFor(loadout.ability),armor=gearFor(loadout.armor),ring=gearFor(loadout.ring);
  const attackBonus=(1+(ring.power??0))*(1+points.attack*.05);
  return {power:(weapon.power??1)*attackBonus,attackBonus,health:10+(armor.health??0)+(ring.health??0)+points.health*5,
    defense:armor.defense??0,speed:160+points.speed*5+(armor.speed??0)+(ring.speed??0),attackRate:1+(ring.dexterity??0)+points.dexterity*.05,
    abilityCooldown:(ability.cooldown??12)*(1-(ring.cooldown??0))*(1-(armor.abilityHaste??0)),ability};
}
export function bossLoot(roll:number,level=1){
  validateRoll(roll);const ids=levelFor(level).weaponIds;return roll<500?ids[Math.floor(roll/125)]:null;
}
// One independent roll per possible drop. Chance above 100% becomes additional
// weapons, retaining the equal four-family weights and avoiding wasted boosts.
export function bossWeaponDrops(rolls:number[],level:import('./levels.ts').LevelId=1,multiple=1){
  const q=entryQuote(level,multiple),count=q.guaranteedWeapons+Number(q.extraWeaponBps>0);
  if(rolls.length<count)throw new RangeError('Missing independent weapon rolls.');
  rolls.forEach(validateRoll);const items:number[]=[];
  for(let i=0;i<count;i++){
    const chance=i<q.guaranteedWeapons?10000:q.extraWeaponBps;
    if(rolls[i]<chance)items.push(bossLoot(Math.floor(rolls[i]*500/chance),level)!);
  }
  return items;
}
export function chestLoot(tierRoll:number,slotRoll:number,typeRoll:number,chestId:ChestId='overgrowth'){
  const tier=chestTier(chestId,tierRoll);validateRoll(slotRoll);
  if(!Number.isInteger(typeRoll)||typeRoll<0||typeRoll>=12)throw new RangeError('Type roll must be 0–11.');
  const items=CHEST_GEAR.filter(g=>g.tier===tier&&g.slot===SLOTS[Math.floor(slotRoll/2500)]);
  return items[typeRoll%items.length].id;
}
function validateRoll(roll:number){if(!Number.isInteger(roll)||roll<0||roll>=10000)throw new RangeError('Roll must be 0–9999.');}
