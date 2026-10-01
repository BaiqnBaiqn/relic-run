# Economy v3 — GEMZ redemption, chests and the Warden

Status: implemented local simulation. All five levels are playable with initial balance values. GEMZ is internal, non-transferable game currency. RF transfers, a multiplayer
service and contract settlement have not been deployed.

## Entry allocation

| Destination | Share | Per 100 RF level-one entry |
| --- | ---: | ---: |
| Global GEMZ redemption pool | 80% | 80 RF |
| Level-one jackpot | 15% | 15 RF |
| Ecosystem | 5% | 5 RF |

Entry funding is allocated once on entry, including failed attempts. There is
one redemption pool across every account and level in this browser's
world; jackpots are indexed separately by level. Boss clears earn GEMZ,
potions and rare weapons, with RF paid only on a jackpot hit or redemption.

A new account receives 500 test RF, recorded as external demo seed funding.
The field guide offers labeled +100 test RF and selected-entry-cost faucets. These are seed funding, not rewards
from entry proceeds. RF uses integer micro-units (1 RF = 1,000,000).

## Entry boosts and combat progression

Choose a whole entry multiple in camp before paying. The saved entry fixes that
multiple for the run. Base fees are 100 / 200 / 400 / 800 / 1,600 RF. Caps are
50× / 250× / 1,250× / 6,250× / 31,250× (maximum fees 5,000 / 50,000 / 500,000 /
5,000,000 / 50,000,000 RF). Every individual GEMZ drop is multiplied exactly;
Without equipment bonuses, L1 at 50× averages 5,000 GEMZ, range 4,000–6,000, for 5,000 RF. Fortune’s Fang adds another 25% while equipped.

Weapon reward multiplier = 1 + 19 × ln(1 + (entry multiple − 1) / 12) / ln(1 + 49 / 12).
This calibrated log curve never exceeds the paid multiplier.
Expected normal weapon count = 0.05 × that multiplier. Integer counts are
guaranteed; the fractional extra roll is rounded down to basis-point precision.
Each award independently chooses a weapon with equal four-family weights (25% each, within basis-point rounding). Thus
50× guarantees one normal weapon; the L5 cap guarantees four with a chance at a
fifth. There is no useless chance above 100%. This does not change chest odds,
potion quantity or size, jackpot odds, or enemy strength. Each clear still gets
exactly one independent 0.25% jackpot roll.

Combat starts at 10 HP. Boss HP is 650 / 1,900 / 3,800 / 6,500 / 10,000, and room
HP scales are 1.65 / 5 / 9 / 15 / 23. Boss projectiles/hazards deal 5 / 44 / 48 /
72 / 105; contact damage varies by enemy. Higher-level minions pursue and charge
faster. The gate heals up to 25% maximum HP. Telegraphs and safe lanes remain.
A deterministic dodge route clears L1 with starter gear, fails L2 with starter
gear, and clears L2 with T1 chest gear plus earned potions. This is a regression check, not a measured
human win rate. Equipment and accumulated potions are the intended progression.

## 24-hour redemption seasons

Anyone with GEMZ may participate; neither a boss clear, level unlock, equipment
nor a nonrecovering Friend is required. Contributions are committed from the
account purse at camp and cannot also be spent on chests. They remain locked
until settlement, when they are consumed exactly once.

Every 24-hour season runs from 00:00 to 00:00 UTC. On a running page they settle when the timer
passes the deadline; reopening catches up before new deposits or entry funding.
With no contributors, RF carries into the next round. An empty RF pool accepts
no new GEMZ. There is no early-settlement button. The panel shows season start/end
dates in local time, a countdown, the contribution estimate and 30 paid seasons
of history. Returning after missed days pays the expired season once and skips
to the current UTC window. Contributions reset; level jackpots are independent.

Payout = RF in the round × account GEMZ contributed / total GEMZ contributed.

BigInt intermediates avoid multiplication precision loss. Integer remainders
are allocated by largest remainder, then account key, so every micro-RF is
distributed and total balances are conserved. Settlement is persisted once;
reload cannot repeat it. Payout estimates change as contributions and funding
arrive; they are not locked quotes.

Every GEMZ within one round has the same redemption value. Harder levels
provide more GEMZ per RF of entry on average for a successful clear: 1, 1.15, 1.3, 1.45
and 1.6 respectively, before equipment bonuses. Their rewards and encounters are in playtest.
The 80% allocation is game-wide, not a guaranteed return for every level or
player. Unsettled RF and retained jackpots remain liabilities. RF accounting
does not assign a market value to GEMZ, potions or equipment.

## Level one and GEMZ

The 960 × 960 Overgrowth opens with three sequential waves: one Mossling
(35 HP, 4 contact damage), one Barkguard (73 HP, 7 contact damage), and one
Briar Spitter (45 HP, aimed 3-damage thorn with a visible warning) per wave.

The 650-HP Hollow Warden alternates radial thorn volleys and a 0.9-second
telegraphed charge. At 50% HP, damage clamps to the threshold, bullets clear
and the boss shields while exactly two marked Mosslings spawn. They activate
after one second. Auto-aim skips shielded targets. Killing both breaks the
shield; below half health, faster and additional aimed thorns join his attack.

Eleven minions × 3 GEMZ + a variable 47–87 boss GEMZ = 80–120 per full clear,
averaging 100. Boss GEMZ uses its own symmetric random roll, independent of
weapons, potions and the jackpot. Minions drop no equipment. These are base-entry rewards before equipment bonuses.
Fortune’s Fang is the one equipment exception: it multiplies GEMZ by 1.25.
Level one has an entirely open floor with no obstacles. Arena edges bound player and enemy movement.

## Equipment chests

One Overgrowth chest costs 250 GEMZ and guarantees one item. About 2–3 base-entry full clears
fund one chest if GEMZ is saved; actual clears required vary. GEMZ from partial runs also counts.

| Tier | Chance |
| --- | ---: |
| T1 | 95% |
| T2 | 4% |
| T3 | 0.8% |
| T4 | 0.1905% |
| T5 | 0.0095% |

Slot, tier and item type use independent unbiased draws. Every slot has a 25%
chance. Each type within a slot is equally likely (four weapons, four abilities,
three armors, four rings). A 0–11 type roll divides evenly across both three and
four types. Per-item odds are tier chance × 25% ÷ number of types in the slot.
The catalog contains 75 chest items: every one of the 15 types has T1–T5.
Existing gear IDs 1–12 retain their old stats as Legacy equipment, excluded from
new chests. Soulbound boss weapons remain separate. New IDs start at 201.
Chest outcomes and payment are saved before the reveal. The item belongs to
the selected Friend's backpack. These are ordinary, non-soulbound items.

### Weapon types

| Type | T1 damage | Range | Attack interval | Attack |
| --- | ---: | ---: | ---: | --- |
| Wand | 57.6 | 440 | 0.90s | One large bolt |
| Bow | 28.8 per arrow | 330 | 0.65s | Two parallel arrows |
| Sword | 99 | 100 | 1.00s | One 110° swipe |
| Dagger | 27 | 75 | 0.24s | One 80° swipe |

T1–T5 weapon damage scales from the base profiles by 1.8 / 2.65 / 3.7 / 5 / 6.5. Range and base
cadence define each weapon's play style and stay fixed across tiers. Dexterity
increases attack rate; Attack boosts weapon damage. Melee hits each enemy in
the arc once per swing. Projectiles expire at their range. The starter wand is
a weaker 24-damage wand. Weapons auto-aim at the nearest vulnerable enemy.

### Abilities, armor and rings

| Ability | T1 / T2 / T3 / T4 / T5 strength | Cooldown by tier |
| --- | --- | --- |
| Dash | 150 / 170 / 190 / 210 / 230 units in 0.2s | 9 / 8 / 7 / 6 / 5s |
| Shield | One hit at every tier; persists until hit; no stacking | 18 / 16 / 14 / 12 / 10s |
| Bash | 180 / 300 / 470 / 700 / 1,000 damage | 12 / 11 / 10 / 9 / 8s |
| Heal | 15 / 30 / 50 / 75 / 105 HP, capped at max HP | 12 / 11 / 10 / 9 / 8s |

Dash and Bash use current movement direction, or the last direction when idle.
Bash strikes a 120° forward arc with 155 / 165 / 175 / 185 / 195 range and scales
with Attack bonuses. Dash has no damage immunity; Space remains the independent
dodge. Shield blocks one eligible hit, then breaks; simultaneous extra hits can
damage the player. Its cooldown starts on activation and it cannot be recast
while active. Robes reduce ability cooldowns, including Shield's.

| Armor | T1 / T2 / T3 / T4 / T5 |
| --- | --- |
| Robes | +15 / 30 / 50 / 75 / 105 HP; 0 / 1 / 1 / 2 / 2 defense; cooldowns 8 / 16 / 24 / 32 / 40% shorter |
| Light | +25 / 45 / 70 / 100 / 140 HP; 1 / 2 / 3 / 4 / 5 defense; +10 / 15 / 20 / 25 / 30 speed |
| Heavy | +40 / 70 / 105 / 145 / 195 HP; 2 / 3 / 4 / 5 / 6 defense; −12 speed |

Defense subtracts from each hit, with a minimum of one damage. Rings each boost
one stat: Health +20 / 40 / 60 / 80 / 100 HP; Attack +15 / 30 / 45 / 60 / 75%;
Dexterity +15 / 30 / 45 / 60 / 75% attack rate; Speed +15 / 30 / 45 / 60 / 75.
Equipment stacks with existing potion bonuses. These are initial playtest values.

## Soulbound boss weapons and jackpots

Every level has a four-weapon collection: wand, bow, sword and dagger.
At base entry each has a 1.25% chance, totaling 5% for a regular weapon.
Normal weapons use 90% of the matching chest tier’s raw weapon power, plus
their signature effect. Entry boosts affect the regular weapon rolls. Above
100%, guaranteed drops plus a fractional extra roll are selected independently.

All damage below is based on the triggering hit after equipment/potion scaling.
Consecutive hits require the same enemy within 1.25 seconds. Secondary damage
cannot proc itself, respects shields/spawn immunity, and stops at victory/death.
Burn/bleed damage ticks every 0.5s. Refreshing a DOT does not stack it or delay
the next tick. Bosses are immune to slow.

| Level / collection | Weapon | Signature effect |
| --- | --- | --- |
| L1 Rootbound | Thorncaster (wand) | Large thorn orbs pierce one additional enemy. |
| L1 Rootbound | Briar Repeater (bow) | Both arrows hitting the same minion slow it by 30% for 1.25s. Bosses resist slow. |
| L1 Rootbound | Barksplitter (sword) | A broad 140° sweep catches clustered enemies. |
| L1 Rootbound | Hollow Fang (dagger) | Every fourth consecutive hit on one enemy applies a 3s bleed: 12% of hit damage per second. |
| L2 Tidebound | Brinebell (wand) | Impact splashes nearby enemies within 65 units for 25% damage. |
| L2 Tidebound | Tideline Bow (bow) | Land both arrows on one enemy to burst for 50% of one arrow’s damage. |
| L2 Tidebound | Barnacle Blade (sword) | Your first swipe within 1.2s of a dodge deals 35% extra damage. |
| L2 Tidebound | Crabclaw Shiv (dagger) | Consecutive hits on one enemy grant 15% movement speed for 1.5s. |
| L3 Prismbound | Prismbranch (wand) | Crystal orbs ricochet once to a nearby enemy for 50% damage, within their remaining range. |
| L3 Prismbound | Shardstring (bow) | Both arrows pierce one additional enemy. |
| L3 Prismbound | Geode Breaker (sword) | Every third swipe deals 40% extra damage. |
| L3 Prismbound | Glassneedle (dagger) | Every fifth consecutive hit on one enemy shatters its mark for 60% extra damage. |
| L4 Emberbound | Kilnheart (wand) | Coals burn for 2s at 12% of hit damage per second. Hits refresh the burn. |
| L4 Emberbound | Emberwood Bow (bow) | The first arrow ignites for 2s; the second deals 30% extra damage to burning enemies. |
| L4 Emberbound | Ashfall Cleaver (sword) | Swipes leave a burning crescent for 1.5s, dealing 12% of swipe damage every 0.5s. |
| L4 Emberbound | Cinderfang (dagger) | Landed attacks build five heat stacks: +4% attack rate each. Heat fades after 1.25s without a hit. |
| L5 Starbound | Cometheart (wand) | Every third orb becomes a comet that pierces all enemies along its path. |
| L5 Starbound | Eclipse String (bow) | A paired hit marks for 5s. The next paired hit detonates for 60% of one arrow’s damage. |
| L5 Starbound | Crownfall (sword) | Charge between attacks: up to 35% bonus swipe damage after 1.2s. |
| L5 Starbound | Nightfall (dagger) | Every sixth consecutive hit on one enemy adds a spectral cut for 75% extra damage. |

Fortune’s Fang (ID 449) is a separate L5 dagger: 87.75 base swipe damage,
0.24s interval, 75 range, 80° arc. It has no combat proc; its special effect
is **+25% GEMZ from every minion and boss while equipped**. It uses the same
soulbound ownership and death protection as other boss weapons.

- L5 boss clears only: independent 0.25% base drop chance.
- Paid entries use the same loot curve: `floor(25 × lootMultiplier) / 10000`.
  At 50× entry this is exactly 5%. It rolls once; the jackpot remains 0.25%.
- Normal weapons, the dagger and a jackpot weapon can all drop on one clear.
- Snapshot its equipped bonus at entry. Owning it unequipped gives no bonus;
  finding it does not retroactively boost that run. Equip at camp for the next run.
- All levels benefit: `earned GEMZ = rolled base GEMZ × entry multiple × 1.25`.
  For example, L1 means 125 GEMZ rather than 100 at 1× entry, with a 100–150 range.
- Quarter-GEMZ are carried exactly in purse, entry and minted totals. A base
  3-GEMZ minion gives 3.75. Chests and redemption spend whole units; the remainder
  stays in the purse. These fields are optional for older v3 saves (zero remainder).
- The bonus does not change RF allocation, jackpots, potion odds, or chest odds.

Only a completed boss kill rolls its level jackpot, once, at 0.25%.
A hit awards floor(pool × 80%) in micro-RF plus the level’s jackpot exclusive.
The remaining 20%, including rounding dust, stays in that jackpot. Entries,
failed runs, chests and redemption never roll a jackpot.

At 1× entry, L1–4 have a 5.2375% chance of any soulbound weapon including the
jackpot; L5 has a 5.47440625% chance including Fortune’s Fang. These are independent
rolls, so multiple rewards are possible. Soulbound weapons are bound to their
earning Friend, cannot be traded through this game, and survive death equipped.
They are never found in chests. The 10,000× chest T5 acquisition target does not
apply to these separate boss rewards.

Historical normal boss weapons (101–103, 111–113, 121–123, 131–133, 141–143)
remain usable in old saves, but new rolls draw from the collections above.
Jackpot IDs remain 104 / 114 / 124 / 134 / 144. New collections currently reuse
the matching family/tier Blender renders; no bespoke boss-weapon models yet.

## Potions

Every level-one boss gives one potion, with an independent 20% chance of a
second. Health, attack, speed and dexterity are uniformly selected.

| Level | Size rule |
| --- | --- |
| 1–2 | Minor only (+1 stat point) |
| 3–4 | Minor or Major, 50% each (+1 or +2) |
| 5 | Major only (+2 stat points) |

All five playable levels use this size function.
Stored quantities are arbitrary-length nonnegative decimal strings, manipulated
with BigInt: there is no gameplay inventory cap. Potions are consumed at camp
for the selected Friend and persist across wins until that Friend dies.

Base health is 10. Each minor potion grants +5 max HP, +5% damage, +5 movement
speed, or +5% attack rate. A major grants twice that bonus. Each stat accepts
20 potion drinks per life; a major uses one drink. Twenty minor health potions
produce 110 HP before gear. Separate drink counters prevent majors from using
two slots. A 21st drink is rejected without consuming it. Storage stays unlimited.
Old saves have no drink history: existing potion points are conservatively counted
as prior drinks, preserving every bonus and stored potion. All consumed bonuses
and drink counters reset on death.

## Death and Genesis

Every battle death or abandonment resets consumed potion bonuses, including
Genesis. Stored potions and unequipped equipment survive. Generation deaths
destroy exactly one equipped copy per ordinary item and apply 12-hour recovery.
Soulbound items remain owned and equipped. Genesis loses no gear and has no
recovery delay. Fees remain spent; earned GEMZ stays in the purse.

Genesis is verified as its own canonical collection through fresh ownership
checks. Guest Genesis is a labeled local rules-testing profile.

## Persistence and migration

relic-run:world:v3 stores the shared world, with separate purses per guest or
wallet account and equipment/points/recovery per Friend. One Web Lock serializes
the local world across tabs; a second copy waits until the first closes.
This is browser-local sharing, not a shared server across devices or people.

Legacy v2 saves are imported once per account. RF, GEMZ, known equipment,
recovery and clear history are preserved. Legacy committed GEMZ becomes available;
old reserves become redemption RF and the old jackpot stays L1.
Any previously claimable RF is credited without duplicating reserve funds.
An abandoned v2 run still applies its existing defeat penalty. Imported
accounts receive the same explicit 500 test RF grant as new accounts.

Legacy keys are left untouched. Resetting the shared playtest creates a
timestamped backup first. Reset controls are labeled as affecting the shared
world, not just a Friend.

## Invariants and deployment boundary

All account RF + redemption RF + level jackpots + ecosystem = recorded seed RF.
Available GEMZ + committed GEMZ + consumed GEMZ = minted GEMZ.
Kills, boss claims, jackpot outcomes, chest debits and round settlement are
persisted atomically per local ledger update and reject repeat rewards.

Browser time, combat and saves are for testing. Live use requires an
authoritative shared ledger, real round scheduling, transaction settlement,
ownership-transfer policy, and server-enforced defeat/loot/entry events.
Neither token deployment nor production publishing is part of this prototype.


## RF/GEMZ cycle review

The camp's RF / GEMZ cycle panel now explains entry funding, combat rewards,
chest spending, redemption and the separate clear-only jackpot. Redemption
previews include both previously committed GEMZ and a proposed new contribution
in the numerator and denominator. The displayed total is an estimate, not an
additional payout on top of the committed estimate. Settlement credits the purse
automatically; no second claim or continued holding is required.

Without equipment bonuses, five successful base L1 entries cost 500 RF and yield an average of 500 GEMZ. They allocate 400 RF
to redemption, 75 RF to the L1 jackpot and 25 RF to the ecosystem. The player
can spend the 500 GEMZ on two base chests OR contribute some/all toward RF. Choosing
a chest does not remove the entries' 400 RF from the shared pool: that RF remains
available to whoever contributes. Gear and potions have no fixed cash-out value.

95% is allocated to player pools, not a fixed realized RTP. RF actually paid
out is tracked separately from RF retained in redemption and level jackpots.
A jackpot is independent on every boss clear (0.25%, or 1 in 400 on average),
not a payout promised after 400 clears. Failed runs fund pools but get no roll.

A sole contributor receives the full round even if they submit just one GEMZ.
This follows the requested pro-rata rule; it makes low-participation rounds
cheap to capture and means this system supplies no fixed RF price for GEMZ.
The UI now makes this explicit. Contributions near the deadline can dilute
earlier estimates. Both are design properties to test with multiple players,
not reasons to imply a fixed token exchange rate.

Higher GEMZ per RF on harder levels improves a successful player's share at the
same round-wide conversion rate. It does not create new RF: it can shift a larger
share of the common pool toward high-level players. Balance using observed clear
rates, partial-run GEMZ, clear times, equipment losses and chest consumption.

The base chest remains mostly T1; its T5 tail is now 0.0095%. The four chest
collections guarantee minimum tiers 1, 2, 3 and 4. Their escalating prices and
T5 odds preserve one expected T5 acquisition cost, as detailed below. Later
levels remain playable without a hard gear gate.
The expedition guide presents recommended gear, not an enforced entry gate.

## Levels 2–5 — playable first pass

All levels keep one room followed by one boss, the 80/15/5 entry split,
one global redemption pool, and independent per-level jackpots. Each boss has
at base entry, one 5% normal soulbound weapon roll (1.25% each among its four weapons),
one guaranteed potion plus a 20% extra-potion chance, and a separate 0.25%
jackpot roll awarding 80% of that level's jackpot plus its unique soulbound
weapon. Potion stats are equally likely. These tables are active in the local playtest.

| Level | Expedition / boss | Entry RF | Mean full-clear GEMZ | Mean GEMZ / RF | Suggested gear | Potions |
| --- | --- | ---: | ---: | ---: | --- | --- |
| 1, live | Overgrowth / Hollow Warden | 100 | 100 | 1 | Starter–T1 | Minor |
| 2 | Sunken Boardwalk / Tidemouth Crab | 200 | 230 | 1.15 | T1–T2 | Minor |
| 3 | Glassroot Quarry / Prismback Tortoise | 400 | 520 | 1.3 | T2–T3 | Minor / Major, 50% each |
| 4 | Cinder Orchard / Kilnkeeper | 800 | 1,160 | 1.45 | T3–T4 | Minor / Major, 50% each |
| 5 | Starfall Sanctuary / Astral Gardener | 1,600 | 2,560 | 1.6 | T4–T5 | Major |

The GEMZ totals count the room and boss together. Every room contains nine enemies,
followed by two summoned guards at half boss health. All floors stay traversable.

| Level | Boss HP | GEMZ per minion | Mean boss GEMZ | Normal weapon IDs | Jackpot weapon ID |
| --- | ---: | ---: | ---: | --- | ---: |
| 1 | 650 | 3 | 67 | 401–404 | 104 |
| 2 | 1,900 | 6 | 164 | 411–414 | 114 |
| 3 | 3,800 | 14 | 366 | 421–424 | 124 |
| 4 | 6,500 | 32 | 808 | 431–434 | 134 |
| 5 | 10,000 | 70 | 1,790 | 441–444 | 144 |

Hazards are locked at creation and use the same shapes for rendering and collision.
Warnings deal no damage. Beams, tides and meteors hit at most once per hazard,
so a one-hit shield absorbs that hazard. Heat can damage again after invulnerability
ends. Tides leave a 170-unit gap; heated quadrants leave an
80-unit central crossing. Boss beams warn for at least 1.15 seconds. Phase changes
clear projectiles and hazards. Each boss has a recovery window for melee attacks.
Level one retains its original fight and open floor. These are initial playtest
values, not final difficulty or expected RF returns.

### Level 2: The Sunken Boardwalk

Pond blue, pale timber and black outlines. A broad square deck stays traversable;
marked tide bands wash across it. Tidemouth Crab alternates a claw fan, a moving
wave with a gap, and an exposed-shell recovery window. Two Shellbacks join at
half health and waves change direction. Reed Skippers hop, Bubble Spitters fire
slow pairs, and Shellbacks telegraph a charge. Teaches crossing moving gaps.
Normal soulbound weapons: Brinebell, Tideline Bow, Barnacle Blade, Crabclaw Shiv.
Jackpot: Pearlbreaker sword.

### Level 3: The Glassroot Quarry

Lilac stone and four crystal pads flush with an open square floor. Prismback
Tortoise locks its aim before firing a beam. Move after the lock, then punish
its recovery. Two Lens Wisps rotate the sources at half health; killing them
interrupts the next sweep. Shardlings burst forward and Geode Guards open into
slow rings. Teaches baiting aim and timing rather than constant circles.
Normal soulbound weapons: Prismbranch, Shardstring, Geode Breaker, Glassneedle.
Jackpot: Refraction wand.

### Level 4: The Cinder Orchard

Coral earth and golden vent markings in four open plots. The Kilnkeeper heats
one marked plot, launches a seed fan, then cools down within melee reach. At
half health two Emberlings ignite alternating plots. Coal Mites pursue, Cinder
Sowers lob marked bursts, and Bellows Guards fire short fans. Always leave a
safe crossing route. Teaches planning movement while keeping damage uptime.
Normal soulbound weapons: Kilnheart, Emberwood Bow, Ashfall Cleaver, Cinderfang.
Jackpot: Sunforge sword.

### Level 5: The Starfall Sanctuary

An ivory square in lilac sky, with a gold compass dividing four open quadrants.
The Astral Gardener moves through tide arcs, locked star beams, and marked meteor
plots. Two Orbit Wisps interrupt the sequence at half health; phase changes
clear bullets. The finale combines two familiar patterns with a shared safe
route, ending each cycle with a reachable damage window. Comet Sprites dash,
Orbit Wisps cast rotating gaps and Crown Guards briefly shield, then open up.
Normal soulbound weapons: Cometheart, Eclipse String, Crownfall, Nightfall.
Additional independent drop: Fortune’s Fang (0.25% base, entry-boosted).
Jackpot: First Light sword.

Select any level at camp, or from the expedition guide. levels.ts is the shared
source for combat, reward accounting and UI values. expeditions.ts preserves
the design descriptions. Initial implementations use marked waves, aimed beams,
heated quadrants, meteors and short recovery windows; further tuning is expected.


## Internal currency and variable rewards (October 2026)

GEMZ is earned and accounted for inside the game. It is neither an ERC-20 token
nor an asset bought on an open market. Players choose between spending GEMZ on
chests and committing GEMZ to the common RF pool. This supersedes earlier token
and liquidity-pair proposals. Live RF payouts will require authoritative combat,
server-side reward issuance and settlement; local saves are not payout proofs.

The per-clear reward means remain 100 / 230 / 520 / 1,160 / 2,560. Independently
roll boss GEMZ in a symmetric interval extending 20% of the full-clear mean in
each direction. Full-clear ranges are 80–120 / 184–276 / 416–624 / 928–1,392 /
2,048–3,072. Minion rewards stay fixed; five L1 clears therefore yield 400–600
GEMZ with an exact 500-GEMZ expectation. The base chest now costs 250 GEMZ.
The rounding distribution is symmetric, not exactly uniform at its endpoints.

The end-of-run jackpot animation reads the committed entry result. It awards
nothing on its own; skipping, muting, reduced motion and reload cannot reroll it.
The jackpot probability, 80% payout and 80/15/5 entry allocation are unchanged.


## Four chest collections and the 10,000× rarity target

| Chest | Cost (GEMZ) | T1 | T2 | T3 | T4 | T5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Overgrowth | 250 | 95% | 4% | 0.8% | 0.1905% | 0.0095% |
| Tidebound | 2,500 | — | 78% | 20% | 1.905% | 0.095% |
| Prismatic | 25,000 | — | — | 80% | 19.05% | 0.95% |
| Astral | 250,000 | — | — | — | 90.5% | 9.5% |

Each purchase drops one ordinary item, with 25% per slot and equal chances
among that slot’s families. These are not weapon-only chests. Soulbound boss
and jackpot drops remain independent and are not tiered chest equipment.

Expected GEMZ spend for any T1 in the base chest = 250 / 0.95 ≈ 263.1579.
Expected spend for any T5 = cost / T5 probability ≈ 2,631,578.9474 for **every**
chest, exactly 10,000 times the T1 expectation. Multiplying odds and cost by
ten together preserves this target. Specific same-family items have the same
ratio because their slot/type probabilities cancel. This target does not
change combat stats and is not an exchange rate or guaranteed result. No pity
counter is implemented. Higher-tier chests offer stronger floors and fewer
openings per T5, not a lower expected GEMZ cost for T5. Prices are deliberately
large because of the requested endgame acquisition target.

Tier rolls use unbiased draws over 1,000,000 possible values so 0.0095% is
represented exactly. Slot, family, boss reward and jackpot rolls remain
independent. All chest prices are halved from the earlier tuning. The odds stay unchanged,
including 95% T1, 4% T2 and 0.8% T3 in the 250-GEMZ base chest.

A durable chest receipt stores chest ID, item ID, recipient Friend, purchase
number and whether the presentation has been revealed. Payment and ownership
commit together before the 5.6-second charge → unlock → silhouette buildup.
The player then presses Reveal treasure. Compare effects and build stats, then
equip directly to the receipt’s recipient Friend; previous gear stays in their backpack.
Unrevealed receipts block another purchase. Close/reopen and reload resume
that saved result; skipping or reduced motion acknowledges the same receipt
without another charge or random draw. Older v3 saves without a receipt remain
valid. The equipped bar, catalog and reveals all use the approved low-poly
Blender sprites, tightly framed without resampling their source images.
