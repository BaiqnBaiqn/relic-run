import {SOULBOUND_COLLECTIONS} from './soulbound.ts';
// Expedition design descriptions. levels.ts combines these with live combat and reward values.
export const EXPEDITION_CONCEPTS=[
  {
    level:2,name:'The Sunken Boardwalk',boss:'Tidemouth Crab',color:'pond',entryRF:200,gemz:230,gear:'T1–T2',potions:'Minor (+5)',
    arena:'A broad square of pale timber over blue water. Crossing tide bands are marked before they wash across the deck; the floor stays traversable.',
    fight:'Sidestep a claw fan, cross behind the sweeping wave, then punish an exposed shell. At half health, two Shellbacks guard opposite edges while the crab changes the wave direction.',
    minions:'Reed Skippers hop toward you; Bubble Spitters fire slow paired shots; Shellbacks announce a straight charge.',
    lesson:'Read moving gaps. Waves and claw fans alternate, leaving an opening for melee builds.',
    weapons:SOULBOUND_COLLECTIONS[1].items.map(g=>g.name),jackpot:'Pearlbreaker · sword',
  },
  {
    level:3,name:'The Glassroot Quarry',boss:'Prismback Tortoise',color:'lilac',entryRF:400,gemz:520,gear:'T2–T3',potions:'Minor / Major (50% each)',
    arena:'A square lavender quarry with four crystal pads flush with the floor. Pad markings warn of beams without blocking movement or shots.',
    fight:'Bait an aimed beam, leave its marked line, then attack during the recovery. At half health, two Lens Wisps rotate the beam sources; destroying them interrupts the next sweep.',
    minions:'Shardlings rush in short bursts; Lens Wisps aim narrow beams; Geode Guards release a slow ring when their shells open.',
    lesson:'Commit to a dodge after the aim locks. The boss rests between patterns so short weapons can reach it.',
    weapons:SOULBOUND_COLLECTIONS[2].items.map(g=>g.name),jackpot:'Refraction · wand',
  },
  {
    level:4,name:'The Cinder Orchard',boss:'The Kilnkeeper',color:'coral',entryRF:800,gemz:1160,gear:'T3–T4',potions:'Minor / Major (50% each)',
    arena:'A square terracotta orchard floor divided into four open plots. Vent stamps light up before one plot heats; a crossing route always remains safe.',
    fight:'Move out of a marked hot plot, dodge the seed fan, then close in while the furnace cools. At half health, two Emberlings ignite alternating plots, never all escape routes.',
    minions:'Coal Mites pursue; Cinder Sowers lob marked bursts; Bellows Guards push a short, slow projectile fan.',
    lesson:'Plan the next safe space while dealing damage. Heat is temporary, with clear recovery windows.',
    weapons:SOULBOUND_COLLECTIONS[3].items.map(g=>g.name),jackpot:'Sunforge · sword',
  },
  {
    level:5,name:'The Starfall Sanctuary',boss:'The Astral Gardener',color:'sun',entryRF:1600,gemz:2560,gear:'T4–T5',potions:'Major (+10)',
    arena:'A large ivory square suspended in lilac sky, with a gold compass engraved into the floor. Four open quadrants give room to reposition.',
    fight:'Three readable phases: tide arcs, locked star beams, then marked meteor plots. At half health, two Orbit Wisps must fall before the sequence resumes. The finale combines two familiar patterns with a shared safe route.',
    minions:'Comet Sprites dash after a warning; Orbit Wisps cast rotating gaps; Crown Guards guard briefly, then expose themselves.',
    lesson:'Apply the timing learned in earlier levels. Phase changes clear bullets; every cycle ends in a reachable damage window.',
    weapons:SOULBOUND_COLLECTIONS[4].items.map(g=>g.name),jackpot:'First Light · sword',
  },
] as const;
