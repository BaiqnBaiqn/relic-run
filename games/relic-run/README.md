# Relic Run — five expeditions

The Overgrowth is a 960 × 960 meadow-green isometric island. Clear three waves of
three enemies, then fight the 650-HP Hollow Warden. At half health he shields,
summons two Mosslings, and resumes only after both are defeated.

Entry costs 100 simulated RF: 80% funds one global GEMZ redemption pool,
15% funds this level's jackpot, and 5% goes to the ecosystem. Eleven minions
drop 3 GEMZ each; the boss independently rolls 47–87. A full clear earns
80–120 GEMZ, averaging 100. GEMZ is internal game currency, not a token.

Spend 250 GEMZ on an equipment chest (T1 95%, T2 4%, T3 0.8%, T4 0.1905%, T5 0.0095%; each slot 25%),
or commit GEMZ to a 24-hour pro-rata RF season. No boss clear is required
for redemption. Committed GEMZ are consumed at settlement. Seasons end daily at 00:00 UTC. RF payouts return directly to the account purse.

Bosses drop minor stat potions and have a separate base 5% soulbound-weapon chance.
Only boss clears roll the 0.25% level jackpot: 80% of the pool and Heartwood
Scepter to the winner; 20% stays in that level's jackpot.

Weapon, Ability, Armor and Ring are equipped at camp. Q uses an ability;
Space dodges. WASD/arrows, click movement and touch controls are supported.
The 75-item chest pool contains five tiers of Wands, Bows, Swords, Daggers;
Dash, Shield, Bash, Heal; Robes, Light Armor, Heavy Armor; and Health, Attack,
Dexterity, Speed rings. Browse every item in the chest store or loot guide.
Types within a slot are equally likely. Legacy equipment remains usable.
The original chest catalog has unique 16×16 sprites in black and white, with heavier
silhouettes and added detail from T1 through T5. Native PNGs use a true 1-bit
palette and a transparent background mask. Pixel art scales with nearest-neighbor
sampling. Native pixel designs are in art/item-pixels-16.ts; run node scripts/item-pixels.mjs
then node scripts/item-sheet.mjs from the root to rebuild the sprites and atlas.
The earlier 8×8 source and exports remain available for comparison.
All 75 chest items now use renders of original Blender models: flat faces,
pure black/white materials, 52–292 triangles, and additive geometry from T1 to
T5. Catalog, loadout, loot and held-weapon artwork share these renders.
art/models/lowpoly/relic-run-75-items.blend contains the editable five-column
library, with named part vertex groups. Individual GLBs are in its glb/ folder;
192×192 transparent renders, catalog IDs and a manifest sit alongside them.
Run npm run art:models to rebuild using Blender (auto-detected on Windows, or
set BLENDER_BIN to its executable). This also creates the filterable comparison
gallery at artifacts/lowpoly-items.html. The game uses PNGs without a 3D runtime.
The earlier user-supplied T1 models are retained in art/models/t1/; rebuild those
with npm run art:models:imported. Combat stats remain defined in gear.ts.
Level one starts as an open arena with no obstacles; movement is limited only by the arena edges.

A Generation's defeat loses ordinary equipped copies, resets consumed potion
bonuses and applies 12-hour recovery. Genesis keeps gear and avoids recovery,
but potion bonuses still reset. Soulbound weapons stay equipped and cannot
move between Friends. Backpack gear and stored potions survive every defeat.
Unfinished runs abandoned by reload, navigation or character switching count
as defeat. Potions have unlimited storage using decimal-string counters.

Run npm run dev from the repository root; open localhost:4173. Guest mode is
wallet-free. The optional wallet screen requires an explicitly selected, freshly
verified owned Friend and uses its artwork. Wallet access is read-only.

All five levels are selectable at camp. Entry RF / mean full-clear GEMZ: L1 100/100,
L2 200/230, L3 400/520, L4 800/1,160, L5 1,600/2,560. Levels 1–2 use minor potions,
3–4 mixed minor/major, 5 major. Every GEMZ in a redemption season has the same
RF value. Each level has four regular soulbound weapons (one per weapon family), plus its own jackpot exclusive.

See ECONOMY.md for rules and accounting, and art/NOTICE.md for artwork credits.
game.json is a local economy reference, not an SDK chance-game deployment.

Camp now includes an RF / GEMZ cycle guide, contribution previews, and playable expeditions
for levels 2–5. See the cycle review and expedition designs in ECONOMY.md.

The Sunken Boardwalk adds tide gaps and an articulated crab boss; Glassroot
Quarry adds locked crystal beams; Cinder Orchard adds heated plots and a
furnace boss; Starfall Sanctuary combines waves, beams and meteors. Each
boss summons two guards at half health. Canvas effects add water ripples,
crystal glints, embers, dash trails and impact rings. Reduce motion suppresses
decorative animation while keeping combat telegraphs visible.


Camp services: choose a Rarefriend in the roster and see its cooldown. All gear,
potions and consumed stats belong to that Friend; the account shares RF and GEMZ.
The bottom-left dock holds equipped items, backpack access and the potion stash.
The bottom-right shop has four chest collections starting at 250 GEMZ. Redemption shows
the global RF pot, settlement countdown and projected pro-rata share.

Every item uses the new low-poly library, including starter, legacy and soulbound
weapons mapped to their corresponding families. T3/T4/T5 receive blue, violet and
gold GLSL glints and silhouette glow through one shared WebGL context. Base
sprites remain black/white and work without WebGL. Reduced motion freezes glints.
FriendSDK sound cues cover clicks, attacks, abilities, loot, chest opening and
jackpot anticipation/results. Sound unlocks on interaction; mute is remembered.

Boss clears show a skippable jackpot reveal of the already-saved result. The
animation never rolls randomness or changes the ledger. Boss GEMZ varies within
±20% of each full-clear mean: 80–120, 184–276, 416–624, 928–1,392 and 2,048–3,072.
Minion drops remain fixed, so partial runs still retain their earned currency.
Real RF transfers remain disabled in this local prototype. No GEMZ token is
planned or deployed.


Four chest collections now cost 250 / 2,500 / 25,000 / 250,000 GEMZ and have
minimum tiers T1 / T2 / T3 / T4. Their T5 odds are 0.0095% / 0.095% / 0.95% /
9.5%, preserving an expected acquisition cost of 10,000 T1 items per T5. See
ECONOMY.md for every tier probability. Openings use a 5.6-second buildup followed by a manual reveal,
with sounds, skip and reduced motion. A durable receipt prevents rerolls or
double charges when the store closes or the page reloads.
The equipment bar now displays larger, tightly framed versions of the actual
Blender sprites and has no old SVG/pixel-art fallback. Rebuild frame metadata
with node scripts/item-frames.mjs after changing the renders (also included in
npm run art:models).

Entry boosts now scale GEMZ exactly with the amount paid. Caps by level are
50× / 250× / 1,250× / 6,250× / 31,250×. The logarithmic weapon boost reaches
20× at 50× entry; chance over 100% becomes additional weapons. Jackpot odds,
potion drops and chest odds stay unchanged. Each entry saves its chosen multiple.

Friends start at 10 HP and can drink 20 potions per stat per life. Minors give
+5 HP / +5% damage / +5 speed / +5% attack rate; majors give double strength
and count as one drink. Gear has stronger tier progression; L2 is tuned for T1
chest gear plus earned potions, or a stronger T2 build. The field guide can add the selected entry cost as labeled test RF.


Soulbound collections: Rootbound (L1), Tidebound (L2), Prismbound (L3),
Emberbound (L4), Starbound (L5). Each regular weapon has a 1.25% base chance;
entry boosts apply to the combined 5% chance. Signature combat effects are
implemented in weapon-effects.ts, with visible burns, slows, marks and flame arcs.
New weapons use matching family/tier Blender renders; bespoke models are not yet made.
Historical boss weapons remain owned, equipped and playable under their original IDs.

Fortune’s Fang is an additional L5 soulbound dagger, independent of regular loot
and jackpots. Its 0.25% base chance uses the entry boost (5% at 50×).
Equipping it before entering any level increases every earned GEMZ drop by 25%
after the paid multiplier. Backpack ownership gives no bonus, and a new drop does
not change the run that awarded it. Exact quarter-GEMZ carries survive saves,
death, chest spending and redemption; spending/submissions use whole GEMZ.

Combat hides all camp panels until returning from the expedition. Health and
boss bars sit above the expanded arena. Season contributions reset daily, payouts
are credited once, and the redemption panel keeps 30 completed payout records.
Chest results compare build stats and equip directly to the recipient Friend.
