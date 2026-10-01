# Relic Run

- **Builder / contact:** Justin Walker · [@BaiqnBaiqn](https://github.com/BaiqnBaiqn)
- **Category:** Economy Potential
- **Source:** https://github.com/BaiqnBaiqn/relic-run
- **Public playable preview:** https://baiqnbaiqn.github.io/relic-run/
- **Stack:** React 19.2.8, TypeScript 6.0.3, Canvas 2D, esbuild, viem 2.56.3,
  FriendSDK **0.1.4** (vendored package, upstream commit
  `ca3bf183b809ecf22d87c63d88ce03969a3f8da2`).

Relic Run turns your owned Rare Friend into the hero of five short action
expeditions, with simulated RF entry funding daily GEMZ redemption seasons,
boss jackpots and the Rare Friends ecosystem.

## Setup and preview requirements

Requires Node.js 22.18+ (Node 24 recommended) and npm. Code, original Blender models, generated icons,
asset notices and reproducible model scripts are included in the source tree.

```sh
git clone https://github.com/BaiqnBaiqn/relic-run.git
cd relic-run
npm ci
npm run dev
```

Local development is at `http://localhost:4173/`; its wallet mode is
`http://localhost:4173/wallet/index.html`. The explicitly requested local guest
mode also tests Genesis immunity and requires no wallet.

For the separate submission build:

```sh
npm run build:submission
```

Output: `games/relic-run/.preview/`. Serve that entire directory on an HTTPS
static host, preserving relative paths and the HTML CSP. It contains no guest
entry page or guest navigation. Do not publish `.guest/` as the entry preview.

The submission build requires an injected/EIP-6963 browser wallet on **Robinhood
mainnet, chain 4663**, holding a **hardwired Generations NFT, generation >= 1**.
Connect, explicitly choose a Friend, and wait for fresh ownership, generation,
canonical NFT-wallet and artwork verification. The chosen NFT's canonical
animation is the player's avatar. Account or network changes invalidate the
session. No RF funding, signatures, approvals or transactions are needed.

The preview is simulated throughout: RF, GEMZ, inventory, chests, daily seasons,
jackpots, test faucets and recovery timers have no redeemable real-world value.

## How to play

1. Choose a Friend, expedition and entry multiple at camp. Equip one weapon,
   ability, armor and ring. Each Friend has its own items, stats and recovery.
2. Move with WASD/arrows, click-to-move or the touch joystick. Attacks target
   nearby enemies automatically. Q/ABILITY uses the equipped ability;
   Space/Shift/DODGE dodges. Escape or focus loss pauses.
3. Clear three minion waves, then fight the boss. At half health it summons two
   guards; defeat them to remove its shield. Each level adds distinct attacks.
4. Spend earned internal GEMZ on equipment chests or commit them to the current
   24-hour RF season. Chest results are saved before a staged, skippable reveal.
   Compare and equip the result directly to its recipient Friend.

| Expedition | Boss | Base entry RF | Clear GEMZ range (mean) | Maximum entry multiple |
| --- | --- | ---: | ---: | ---: |
| L1 Overgrowth | Hollow Warden | 100 | 80–120 (100) | 50× |
| L2 Sunken Boardwalk | Tidemouth Crab | 200 | 184–276 (230) | 250× |
| L3 Glassroot Quarry | Prismback Tortoise | 400 | 416–624 (520) | 1,250× |
| L4 Cinder Orchard | Kilnkeeper | 800 | 928–1,392 (1,160) | 6,250× |
| L5 Starfall Sanctuary | Astral Gardener | 1,600 | 2,048–3,072 (2,560) | 31,250× |

## Costs, odds and consumables

Every entry, including a failed run, allocates **80%** to one global daily RF
pool, **15%** to that level's separate jackpot and **5%** to the ecosystem.
Seasons run from 00:00 UTC to the next 00:00 UTC. All season RF is distributed
pro rata by committed GEMZ; those GEMZ are consumed. Empty-contributor seasons
carry RF forward. Jackpots carry separately. The 95% player allocation is not a
guaranteed personal return; success, chest spending, competing contributions and
jackpot timing affect outcomes. In this prototype the shared world is only
within one browser, not a server-wide pool.

Only a boss clear rolls its jackpot: **0.25%** chance, paying **80%** of its
current pot and an exclusive soulbound weapon; **20%** stays in the pot. Regular
boss soulbound weapons have a **5%** total base chance, split equally among four
weapons (**1.25%** each). L5 has an independent **0.25%** base Fortune's Fang drop;
equipping it before entry gives **+25% GEMZ** on all kills.

Entry multiples scale GEMZ exactly. Weapon rewards use
`1 + 19 * ln(1 + (multiple - 1) / 12) / ln(1 + 49 / 12)`, reaching 20× at 50×
entry. Chances above 100% become guaranteed weapons plus a fractional extra
roll. The Fang's base chance receives this boost. Jackpot odds, potions and
chest odds do not receive entry boosts.

Each chest yields one ordinary item. Each of the four slots is equally likely;
types within a slot are equally likely. There are 75 items across T1–T5.

| Chest | GEMZ | T1 | T2 | T3 | T4 | T5 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Overgrowth | 250 | 95% | 4% | 0.8% | 0.1905% | 0.0095% |
| Tidebound | 2,500 | — | 78% | 20% | 1.905% | 0.095% |
| Prismatic | 25,000 | — | — | 80% | 19.05% | 0.95% |
| Astral | 250,000 | — | — | — | 90.5% | 9.5% |

T5 has the same expected GEMZ acquisition cost across chests: approximately
2,631,579 GEMZ, 10,000× the expected cost of one base-chest T1. This is an average,
not a guarantee or a pity timer.

Bosses guarantee one potion and have a 20% chance of a second. The four stats
are equally likely. L1–L2 drop minor potions, L3–L4 split minor/major equally,
and L5 drops major potions. Minor effects: +5 HP, +5% attack, +5 speed or +5%
dexterity/attack rate; major effects are double. Each Friend can drink 20 potions
per stat per life. Stored potion counts are unlimited. Consumed bonuses reset
on death; stored potions survive.

Generations lose ordinary equipped item copies on death and recover for 12
hours. Soulbound weapons, backpack items and earned GEMZ survive. Leaving an
unfinished run counts as defeat. Genesis immunity remains available in the
local playtest only. New preview accounts receive 500 simulated RF; the field
guide contains clearly labeled test-RF grants.

## SDK sandbox, wallet saves and contracts

FriendSDK `ConnectedGameHost` hosts `GameSession` in an `allow-scripts` iframe
without same-origin permission. The trusted host owns the SDK wallet session,
selection and fresh eligibility reads; game code cannot access the parent DOM,
wallet provider or localStorage. The canonical artwork is rendered inside the
game for the selected Friend. No wallet action or signature is requested.

The trusted host persists simulated progress through a session-bound MessagePort.
It checks the source frame, selected token ID, canonical wallet scope, save
schema, RF/GEMZ conservation and other Friends' records, then acknowledges each
write. Slow/failed saves pause play and offer retry. A global Web Lock prevents
concurrent writers; reload/exit recovers unfinished runs as defeat.

Saves are keyed by chain + canonical NFT wallet, with inventory and equipment
belonging to that Friend. Reconnecting and selecting the same Friend on the same
site and browser restores items, potions, balances and cooldowns. Changing the
signing owner does not change that canonical key; NFT transfers do not export
browser data. Items are local game records, not tokens or cloud saves. Clearing
browser data removes them, and other devices/origins have separate worlds.

The custom build uses the exported SDK runtime with its required chance-game
adapter definition in `game.json`. Those reference chance actions are unused;
all actual game costs and probabilities are in `economy.json` and the tested
custom economy. The save port is our preview extension, not a stock SDK storage
feature. Build with `npm run build:submission`, which produces both the trusted
host and sandbox child documents; the generic SDK CLI build is not our hosting
entry point. The child has a restrictive CSP and no transaction bridge actions.

Read-only checks on October 1, 2026 passed for chain 4663, Generations/Genesis/RF
bytecode, the pinned artwork registry and metadata adapter, sample Generation
#7730 ownership/canonical wallet/64 animation frames, Genesis #652 metadata
portrait, and RF's symbol and 18 decimals. The script uses public samples, not
claims about a connected player's holdings. Run `npm run check:contracts` for
fresh results in `artifacts/contract-checks.json`.

**No Relic Run economy contract is deployed.** There are no live entry payments,
chest purchases, jackpot payouts or season claims. These checks are not a
security audit or proof of working real-money settlement.

## Checks and known issues

```sh
npm run typecheck
npm run check
npm run check:sdk
npm test
npx playwright install chromium
npm run test:wallet
npm run test:submission
npm run test:sandbox
npm run test:guest
npm run check:contracts
```

October 1, 2026 verification: 80 unit tests, TypeScript, economy validation,
SDK game validation, builds and desktop/mobile browser checks passed. Unit tests
cover all five fights, every chest tier/odds, soulbound effects, exact funding,
24-hour settlement, potion limits, save isolation and death recovery.

Wallet/public tests use SDK RPC/provider fixtures and verify explicit selection,
canonical avatar/wallet, save restoration, wrong network, nonowners, generation
zero, stale selections, missing artwork and no signing. Public layout is checked
at 1100px and 390px. The sandbox gameplay suite verifies blocked parent/storage
access, chest purchase with a failed-save retry, selection/reload restoration,
a full boss clear, exact pool funding, and abandoned-run item loss/cooldown.
Guest checks exercise repeated clears, equipment, potions, redemption and touch
controls. Fixture code is not bundled in either public document.

Live RPC contract reads are checked separately. A human-wallet browser
playthrough remains unverified. No Relic Run economy contract is deployed:
entry payments, chest purchases, jackpot payouts and season claims are simulated.
The read-only contract checks are not an audit or proof of live settlement.

Local state, random outcomes and browser time are editable and unsuitable for
real funds. Production needs authoritative combat/rewards, authenticated storage,
multiplayer season accounting and separately reviewed RF contracts. Keep the
public preview simulated. A current browser with HTTPS and Web Locks is required.
Another active game tab waits for the first to close. No staking or GEMZ token
is implemented; GEMZ is an internal currency tied to simulated RF redemption.

## Credits

FriendSDK/Rare Friends provides canonical NFT artwork, world-art references,
the optional palette and synthesized sound APIs. SDK code is Apache-2.0; its
NOTICE permits attributed artwork use. The 75 current item models/icons are
original Blender work in this repository; RuneScape and Realm of the Mad God
were visual/mechanical references, not copied asset sources. Earlier PixMesh
T1 models supplied by the builder are retained as studies and are not the
current 75-item runtime library. Full sources and notices are in
[the asset notice](https://github.com/BaiqnBaiqn/relic-run/blob/main/games/relic-run/art/NOTICE.md).

- [FriendSDK](https://github.com/spokesz/friendsdk)
- [Official Rare Friends contracts](https://rarefriends.com/docs/contracts)
- [Fishing format reference](https://github.com/spokesz/rarefriends-vibeathon/pull/1)
- [Submission requirements](https://github.com/spokesz/rarefriends-vibeathon#how-to-submit)
