# Relic Run

A Rare Friends action roguelite: play as your owned Friend through five short
expeditions, collect gear and contribute internal GEMZ to daily simulated RF seasons.

**[Play the public preview](https://baiqnbaiqn.github.io/relic-run/)** ·
**[Rules, costs and full reward odds](submissions/relic-run/README.md)** ·
**[Submission review](docs/SUBMISSION_REVIEW.md)** ·
**[Security review](docs/SECURITY_REVIEW.md)**

Built by **Justin Walker / [@BaiqnBaiqn](https://github.com/BaiqnBaiqn)** for the
Rare Friends vibeathon, Economy Potential category.

![SDK sandbox gameplay](docs/screenshots/sdk-camp.png)
*Automated test-wallet fixture, showing the actual SDK host and sandbox game.*

## Play

The public demo requires a browser wallet holding a hardwired Rare Friends
Generations NFT (generation 1+) on Robinhood mainnet, chain **4663**. Connect,
choose your Friend and enter an expedition. The selected NFT's canonical image
is your avatar. No RF funding, signature, token approval or transaction is needed.
All balances, rewards, purchases, jackpots and recovery timers are simulated.

Move with WASD/arrows, click-to-move or the touch joystick. Attacks are automatic.
Q uses your equipped ability; Space/Shift dodges. Escape or focus loss pauses.
Clear three minion waves, then the boss and its two half-health guards. Spend
GEMZ on gear chests or commit it to the 24-hour RF season, ending at midnight UTC.

There are 75 ordinary chest items across T1–T5 and four equipment slots, five
boss soulbound weapon collections, five jackpot exclusives and L5 Fortune's Fang.
Higher levels add tide attacks, crystal beams, heat hazards and combined patterns.
Generation defeat loses ordinary equipped gear, resets consumed potion bonuses
and imposes 12-hour recovery. Soulbound weapons, backpack items and stored potions
survive. Leaving an unfinished run counts as defeat.

## Install and run

Node.js **22.18+** (Node 24 recommended), npm and a current browser are required.

```sh
git clone https://github.com/BaiqnBaiqn/relic-run.git
cd relic-run
npm ci
npm run dev
```

Local development opens at `http://localhost:4173/?mode=guest`; no wallet is
needed for this explicitly separate playtest. Local wallet mode is
`http://localhost:4173/wallet/index.html` and also supports Genesis rules.
`npm run dev:wallet` uses port 4174. Guest progress stays separate from the
public sandbox's saves. The development server binds to 0.0.0.0 for LAN testing.

For the actual ownership-gated submission build:

```sh
npm run build:submission
```

Serve **all seven files** from `games/relic-run/.preview/` on HTTPS, preserving
relative paths and HTML CSP. The public build has no guest route or query bypass.
The GitHub Pages workflow validates and publishes this directory on main updates.
Do not publish `.guest/` as the submission preview.

## SDK and persistence

Uses React 19.2.8, TypeScript 6.0.3, Canvas 2D, esbuild, viem 2.56.3 and
**FriendSDK 0.1.4**, vendored from upstream tag commit
`ca3bf183b809ecf22d87c63d88ce03969a3f8da2` for reproducible installs.

`wallet.tsx` owns connection/selection through SDK helpers. `sandbox-host.tsx`
mounts **ConnectedGameHost**, which freshly verifies the selected Friend and
runs **GameSession** from `sandbox-child.tsx` in an opaque-origin iframe with
`sandbox="allow-scripts"`. Game code has no parent DOM, wallet-provider or browser
storage access. The selected canonical artwork is read using the SDK sprite API.

Our narrow MessagePort extension carries simulated saves to the host, which
checks the frame/session, selected Friend, schema, conservation, entry funding,
protected shared reserves and exact season settlements before
persisting and acknowledging. A Web Lock permits one writer across tabs. Failed
saves pause with retry; unfinished entries recover as defeat. Inventory, equipped
items, potions and cooldowns are keyed by the verified **canonical NFT wallet**.
Reconnect and select the same Friend to restore them on this site and browser.
Saves are not cloud-synced or on-chain items. Changing devices or clearing browser
data does not preserve them; signing-owner changes do not change the NFT-wallet key.

The runtime requires a chance-game definition: `game.json` contains explicitly
unused reference metadata. This game never calls those chance actions. The real
custom economy is described in `economy.json` and implemented in `economy.ts`.
Use our custom build command above, not the generic SDK CLI hosting build, to
include both the sandbox and persistent-save host.

## Tokenomics: what RF and GEMZ do

RF is the proposed entry and payout asset. **GEMZ is an internal, non-transferable
game balance**, earned by defeating enemies and spent on gear or season claims.
It is not an ERC-20, has no liquidity pair or open-market purchase flow, and earns
no staking yield. In this public preview, even RF is simulated: there are no real
payments, redeemable claims or deployed Relic Run economy contracts. The shared
ledger is local to one browser, not a multiplayer server.

The intended cycle is:

```text
RF entry ─┬─ 80% → one global daily RF pool ← committed GEMZ
          ├─ 15% → that expedition level's jackpot
          └─  5% → Rare Friends ecosystem allocation

Combat → internal GEMZ ─┬─ chests → gear → stronger Friend → harder expeditions
                       └─ daily contribution → share of that day's funded RF

Boss clear → potions + rare soulbound weapons + one jackpot roll
```

### Funding and daily redemption

Every entry allocates its full cost once, including entries that end in defeat.
For a 100 RF L1 entry, **80 RF funds the global pool, 15 RF funds L1's jackpot,
and 5 RF goes to the ecosystem allocation**. All five levels share one redemption
pool; each level has its own jackpot. Buying a chest consumes GEMZ, not RF, so it
does not create an additional RF allocation or an RF burn.

Seasons run from midnight to midnight UTC. Players may commit any available GEMZ
at camp, including GEMZ saved from earlier seasons. Commitments cannot be
withdrawn or used for chests. At the deadline they are consumed exactly once:

`player payout = funded season RF × player's committed GEMZ / all committed GEMZ`

For example, 1,000 RF of entries funds 800 RF for the season, 150 RF across the
levels' jackpots and 50 RF for the ecosystem. If Alice commits 300 GEMZ and Bob
100 GEMZ, with no other contributors or carry-in, they receive 600 RF and 200 RF.
Those are gross payouts, not profits: their entry costs and gear spending still
matter. Additional GEMZ contributions dilute each existing share; additional
entries increase the RF pool. The UI's estimate is not a locked exchange rate.

Settlement uses integer micro-RF and BigInt intermediates; largest-remainder
rounding distributes the entire pool without creating funds. A season with no
contributors carries its RF forward. Reopening the game settles expired seasons
once. The prototype's 500 test RF starting balance and labeled faucets are
explicit demo seed funding, not income the economy generates for itself.

### Progression changes earning efficiency

| Level | Base entry RF | Mean full-clear GEMZ | Full-clear GEMZ per entry RF | Entry cap |
| --- | ---: | ---: | ---: | ---: |
| L1 | 100 | 100 | 1.00 | 50× |
| L2 | 200 | 230 | 1.15 | 250× |
| L3 | 400 | 520 | 1.30 | 1,250× |
| L4 | 800 | 1,160 | 1.45 | 6,250× |
| L5 | 1,600 | 2,560 | 1.60 | 31,250× |

Full-clear GEMZ varies ±20%; partial runs retain only their earned drops. Harder
levels reward survival, better equipment and potion investment with more GEMZ
per RF spent. Every contributed GEMZ still receives the **same value within a
season**, regardless of its source. Gear can increase a player's share of the
finite RF pool; it does not generate additional RF or ensure a profitable run.
Measured human clear rates are needed before projecting typical returns.

Entry multiples scale both RF cost and each GEMZ drop exactly. For example, L1
at 50× costs 5,000 RF and averages 5,000 GEMZ if fully cleared. This improves
rewards per minute, not GEMZ per RF within that level. Weapon rewards grow more
slowly: `1 + 19 × ln(1 + (multiple − 1)/12) / ln(1 + 49/12)`, giving 20× weapon
rewards at 50× cost. Above 100% weapon odds, whole weapons are guaranteed and the
fractional remainder is rolled. Entry boosts do not improve jackpot odds, chest
odds or potion quantities. Larger entries concentrate more loss in a single run.

The L5 soulbound Fortune's Fang is a separate 0.25% base drop, affected by the
weapon boost. Equipping it before entry adds 25% GEMZ. Its benefit increases that
Friend's competitive claim share; it does not increase the funded season pool.

### Why spend GEMZ on gear?

GEMZ has two competing uses: immediate participation in a season or investing in
gear for future expeditions. The same GEMZ cannot do both. Four chests cost
**250 / 2,500 / 25,000 / 250,000 GEMZ**, with T1 / T2 / T3 / T4 tier floors and
small chances of higher tiers. One purchase gives one ordinary item. Outcomes
save before the staged 5.6-second opening and manual reveal; skipping or using
reduced motion does not change the odds.

T5 probabilities are 0.0095% / 0.095% / 0.95% / 9.5%, respectively. Consequently,
`chest price / T5 probability` is about **2,631,579 GEMZ** for every chest. A
base-chest T1 has expected cost `250 / 0.95 ≈ 263.16 GEMZ`: the T5 acquisition
cost is 10,000× that benchmark. This measures repeat independent attempts, not
market value, a guaranteed drop or a pity timer. Better chests offer better
minimum gear without making T5 cheaper in expectation.

Potions improve health, attack, speed or dexterity for that Friend's current
life, with 20 drinks per stat and unlimited stored potion counts. Generations
lose ordinary equipped copies and consumed bonuses on defeat and recover for
12 hours. Backpack items, stored potions, earned GEMZ and soulbound weapons
survive. These rules give replacement gear and consumables a recurring use;
soulbound boss rewards preserve some progress. They also impose real gameplay
costs, so chest spending only pays off if subsequent results justify it.

### Jackpot funding and the meaning of 95%

Only a boss clear rolls the level's **0.25%** jackpot chance. A hit awards 80%
of the current pot plus its exclusive soulbound weapon; 20% carries forward.
Failed runs still fund the pot but do not roll. Each clear gets one roll,
regardless of its entry multiple. With independent rolls, the mean wait is 400
clears, and there is still about a 36.7% chance of no hit after 400 clears.

**95% is the allocation to player pools, not a fixed or guaranteed RTP.** At any
point, RF may remain in an unfinished season, an empty season's carry or an
unhit jackpot. Over continuing funded play, those balances can be distributed;
the 20% jackpot carry is not a second ecosystem fee. An individual can lose an
entry, spend all GEMZ on chests, receive no jackpot, or receive more RF than
their own entry through redistribution. The model makes no promise that every
player, level or season earns back 95%.

### How the cycle can benefit Rare Friends

The game gives an owned Rare Friend a visible role and persistent equipment,
progression and recovery choices. If players enjoy returning, RF entry utility
can support repeated use of $RAREFRIENDS; the explicit 5% allocation can fund
ecosystem work under a future published treasury policy. Daily seasons recirculate
funded RF, while GEMZ chest spending gives progression a purpose beyond claims.
Higher difficulties reward learning and gearing up rather than only replaying
the easiest encounter.

These are incentives, not proof of sustainable demand or token-price growth.
There is no automatic RF buyback or burn. Gear leaders, bots and the Fang bonus
can concentrate season payouts. Banked GEMZ and late deposits can sharply dilute
estimates. Lower activity means smaller newly funded pools; rare jackpots can
remain unpaid for long periods. The total RF available is bounded by funded
balances even when many players want to redeem. A full-pool distribution remains
solvent by varying the RF/GEMZ rate, but that does not guarantee an attractive
rate or retain players.

Before real deployment, measure retention, deaths, progression, GEMZ saved versus
spent, claim concentration and payout timing. An authoritative service must
verify combat and issuance, bind saves to authenticated owners, enforce one-time
claims and reconcile every entry receipt to treasury/pool liabilities. Free test
RF must never become a real liability without explicit funding. Real settlement
contracts need separate implementation, testing and review; the current client
is deliberately unsuitable for that role.

See [full costs and odds](submissions/relic-run/README.md),
[implementation accounting](games/relic-run/ECONOMY.md) and
[security findings and remaining limits](docs/SECURITY_REVIEW.md).

## Verify

```sh
npm run typecheck
npm run check
npm run check:sdk
npm test
npx playwright install chromium
npm run test:submission
npm run test:sandbox
npm run test:wallet
npm run test:guest
npm run check:contracts
```

84 unit tests cover economy conservation, five fights, odds, gear effects,
24-hour seasons, potion limits and save/death rules. Browser checks use isolated
SDK wallet/RPC fixtures, with no real signing or transactions. They verify the
actual SDK sandbox, a full boss fight, chest purchases, failed-save recovery,
reconnect/reload, ownership failures, canonical avatars and desktop/mobile UI.
The public bundle contains no fixtures. The SDK frame is at most 960 × 640,
with a larger 960 × 960 world rendered inside it. Browser checks verify frame
bounds, isolated storage, blocked host embedding and release asset hashes.
Screenshots are written to `artifacts/`. `npm audit` reported zero known
dependency vulnerabilities on October 1, 2026; this is not a security guarantee.

`check:contracts` performs only public RPC reads of the Robinhood chain, NFT/RF
bytecode, ownership/canonical wallet and original artwork. Dated JSON is written
to `artifacts/contract-checks.json`. A human-wallet playthrough is not yet verified.

**No Relic Run economy contracts are deployed.** This is a working simulated
submission preview, not live RF settlement. Client combat, time and randomness
are editable; real rewards require an authoritative backend, authenticated
storage and separately reviewed RF contracts. Official Rare Friends production
publication is separate from this public preview/submission.

## Art and credits

Original low-poly Blender models and sprites: `games/relic-run/art/models/lowpoly/`.
All 75 items have iterative silhouettes, two black/white materials and 52–292
triangles. `npm run art:models` rebuilds models/renders with Blender installed;
set `BLENDER_BIN` if it cannot be found. Generated game icons are checked in,
so Blender is not required to run or build the game. Models supplied by the
builder and older pixel studies are retained separately as reference assets.

FriendSDK provides canonical NFT artwork, palette/world references and synthesized
sound APIs. Equipment geometry and combat effects are original. RuneScape and
Realm of the Mad God were visual/mechanical references, not copied asset sources.
[Full asset notice](games/relic-run/art/NOTICE.md) ·
[FriendSDK](https://github.com/spokesz/friendsdk) ·
[Vendored SDK license/notice](vendor/README.md).
