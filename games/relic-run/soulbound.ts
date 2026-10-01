export type WeaponPerk='pierce'|'paired-slow'|'wide-sweep'|'bleed'|'splash'|'paired-burst'|'dodge-strike'|'fleet'|'ricochet'|'third-strike'|'shatter'|'burn'|'ember-pair'|'fire-sweep'|'heat'|'comet'|'eclipse'|'charge'|'spectral';
type Definition={id:number;name:string;family:'wand'|'bow'|'sword'|'dagger';perk:WeaponPerk;effect:string};
export const SOULBOUND_COLLECTIONS:{level:number;name:string;items:Definition[]}[]=[
  {level:1,name:'Rootbound',items:[
    {id:401,name:'Thorncaster',family:'wand',perk:'pierce',effect:'Large thorn orbs pierce one additional enemy.'},
    {id:402,name:'Briar Repeater',family:'bow',perk:'paired-slow',effect:'Both arrows hitting the same minion slow it by 30% for 1.25s. Bosses resist slow.'},
    {id:403,name:'Barksplitter',family:'sword',perk:'wide-sweep',effect:'A broad 140° sweep catches clustered enemies.'},
    {id:404,name:'Hollow Fang',family:'dagger',perk:'bleed',effect:'Every fourth consecutive hit on one enemy applies a 3s bleed: 12% of hit damage per second.'},
  ]},
  {level:2,name:'Tidebound',items:[
    {id:411,name:'Brinebell',family:'wand',perk:'splash',effect:'Impact splashes nearby enemies within 65 units for 25% damage.'},
    {id:412,name:'Tideline Bow',family:'bow',perk:'paired-burst',effect:'Land both arrows on one enemy to burst for 50% of one arrow’s damage.'},
    {id:413,name:'Barnacle Blade',family:'sword',perk:'dodge-strike',effect:'Your first swipe within 1.2s of a dodge deals 35% extra damage.'},
    {id:414,name:'Crabclaw Shiv',family:'dagger',perk:'fleet',effect:'Consecutive hits on one enemy grant 15% movement speed for 1.5s.'},
  ]},
  {level:3,name:'Prismbound',items:[
    {id:421,name:'Prismbranch',family:'wand',perk:'ricochet',effect:'Crystal orbs ricochet once to a nearby enemy for 50% damage, within their remaining range.'},
    {id:422,name:'Shardstring',family:'bow',perk:'pierce',effect:'Both arrows pierce one additional enemy.'},
    {id:423,name:'Geode Breaker',family:'sword',perk:'third-strike',effect:'Every third swipe deals 40% extra damage.'},
    {id:424,name:'Glassneedle',family:'dagger',perk:'shatter',effect:'Every fifth consecutive hit on one enemy shatters its mark for 60% extra damage.'},
  ]},
  {level:4,name:'Emberbound',items:[
    {id:431,name:'Kilnheart',family:'wand',perk:'burn',effect:'Coals burn for 2s at 12% of hit damage per second. Hits refresh the burn.'},
    {id:432,name:'Emberwood Bow',family:'bow',perk:'ember-pair',effect:'The first arrow ignites for 2s; the second deals 30% extra damage to burning enemies.'},
    {id:433,name:'Ashfall Cleaver',family:'sword',perk:'fire-sweep',effect:'Swipes leave a burning crescent for 1.5s, dealing 12% of swipe damage every 0.5s.'},
    {id:434,name:'Cinderfang',family:'dagger',perk:'heat',effect:'Landed attacks build five heat stacks: +4% attack rate each. Heat fades after 1.25s without a hit.'},
  ]},
  {level:5,name:'Starbound',items:[
    {id:441,name:'Cometheart',family:'wand',perk:'comet',effect:'Every third orb becomes a comet that pierces all enemies along its path.'},
    {id:442,name:'Eclipse String',family:'bow',perk:'eclipse',effect:'A paired hit marks for 5s. The next paired hit detonates for 60% of one arrow’s damage.'},
    {id:443,name:'Crownfall',family:'sword',perk:'charge',effect:'Charge between attacks: up to 35% bonus swipe damage after 1.2s.'},
    {id:444,name:'Nightfall',family:'dagger',perk:'spectral',effect:'Every sixth consecutive hit on one enemy adds a spectral cut for 75% extra damage.'},
  ]},
];
export const FORTUNE_FANG_ID=449,FORTUNE_BONUS_BPS=2500;
