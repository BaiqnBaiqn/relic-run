# Relic Run security review

Reviewed October 1, 2026. Scope: application source, SDK integration, save bridge,
economy accounting, static deployment configuration and locked dependencies.
This is an engineering review with regression tests, not an independent audit
or permission to handle real funds.

## Result and trust boundaries

The public preview makes read-only ownership/artwork calls. It contains no
Relic Run settlement contracts, transaction flow, signing request, RF allowance
or GEMZ token. Wallet connection is not cryptographic authentication to a server.
Local test balances must remain non-redeemable.

The trusted host uses SDK wallet discovery and fresh owner/generation checks.
The canonical NFT wallet is read at the eligibility check's block. Selection
and connection revisions prevent an old async result from opening a previous
account's game. Chain/account changes unmount the session; the SDK rechecks the
selected Friend. Artwork failure blocks entry instead of substituting a demo NFT.

Game code runs in an opaque-origin `allow-scripts` iframe, without same-origin
permission. Its custom save port is scoped to the actual frame, selected token,
document nonce and monotonically increasing request IDs. Opaque origins require
`*` for the initial transfer target; the host checks `event.source` and the
opaque origin before transferring a dedicated MessagePort. Ports close on
document/session changes. Saves have schema and size limits. ACKs follow durable
host storage, and a Web Lock serializes writers across tabs.

## Findings fixed

| Finding | Exposure in this preview | Change and evidence |
| --- | --- | --- |
| Conserved but unauthorized shared-ledger patches | A modified child could reassign another Friend's committed GEMZ or directly move RF reserves into its own purse while preserving total balances. | `validateSessionSave` now preserves other contributors and checks exact paid-entry allocations, reserve changes, allowed preview grants and jackpot transitions. Adversarial unit tests construct previously valid conserved thefts and reject them. |
| Mutable season deadline/history | A modified child could extend the closing time or rewrite a prior settlement without changing current balances. | Host-clock settlement is recomputed when the round changes; dates, payout totals and history must match. Early settlement, extension and history rewriting have regression tests. |
| Embedded trusted wallet UI | A third-party page could frame the host's wallet interface. | Public host refuses to mount wallet UI when embedded and offers an explicit new-tab link. Browser test verifies the guard. Production should additionally enforce HTTP `frame-ancestors`; HTML CSP cannot provide that directive. |
| Mutable action release tags | CI actions referenced movable version tags. | First-party workflow actions now reference exact commit SHAs. Build permissions are read-only; only the deployment job receives Pages and OIDC write permissions. This does not audit the actions' own dependencies. |
| Stale static release assets | An unversioned script URL could retain older save/security code after a release. | Content hashes version JS, CSS and the child document; the host hash includes its child URL. Browser tests check hashes match emitted bytes. A currently open session still needs reopening to run a new release. |

This review also corrected the SDK frame's size to meet the submission viewport
limit. A gameplay test exposed a test-driver race when the last automatic attack
removed ability controls at the gate; the driver now checks their visibility
before using them. The full boss/save/reload test subsequently passed.

## Remaining limits — no real-money deployment

- **Client outcomes are not authoritative.** A player can alter their own
  inventory, combat, GEMZ issuance, random rolls or clock in browser tools. The
  bridge validates ledger transitions, not whether a reported victory or lucky
  jackpot really happened. A forged qualifying win can still claim a simulated
  jackpot. The tests above do not establish anti-cheat protection.
- **Local storage is not an authenticated database.** The browser's user, an
  extension or compromised same-origin host code can rewrite it directly,
  bypassing the bridge. Clearing storage resets progress. Save keys identify a
  canonical NFT wallet but do not make items on-chain, transferable or available
  across devices. Other users cannot participate in a shared internet-wide pool.
- **Eligibility is checked on selection, not continuously against every new
  block.** A later NFT transfer without a wallet event may leave the existing
  simulated session open. Production must reauthorize each value-bearing action
  and invalidate ownership sessions after transfers.
- **Clock and randomness are browser inputs.** Current daily cutoffs and random
  outcomes are suitable only for a preview. Production needs authoritative time,
  verifiable outcome policy, replay protection and one-time settlement/claims.
- **Third-party infrastructure remains trusted.** The wallet extension, public
  RPC, SDK and static hosting can fail or be compromised. The pinned dependency
  and CSP controls reduce exposure but do not remove it. Browser RPC calls expose
  normal request metadata to the RPC provider; the game adds no analytics service.
- **Numeric/storage limits still exist.** RF uses safe integer micro-units and
  BigInt settlement arithmetic, but balances/history are ultimately browser
  records. Potions have no gameplay storage cap; browser quota is finite. A
  production ledger needs operational limits and overflow/load testing.

To enable real RF, implement an authenticated authoritative service, validated
combat/issuance, funded entry receipts, atomic shared accounting and separately
reviewed claim/treasury contracts. Keep client code unable to mint liabilities.
Document admin powers, fee routing, funding, replay prevention and failure
recovery; remove or explicitly fund all test grants. None of that infrastructure
is represented as complete here.

## Checks and evidence

| Check | Result on October 1, 2026 |
| --- | --- |
| `npm test` | 84 passed, including adversarial bridge cases, conservation, exact settlement and duplicate reward protection |
| `npm run typecheck`, `npm run check`, `npm run check:sdk` | Passed |
| `npm run test:submission` | Passed at 1100px and 390px: public gate, canonical avatar/wallet, stale and ineligible selection rejection, no signing, blocked host embedding, viewport and asset hashes |
| `npm run test:sandbox` | Passed: actual opaque iframe isolation, chest save failure/retry, selection/reload persistence, full L1 clear, exact RF funding and abandoned-run defeat |
| `npm run check:contracts` | 10 read-only checks passed for chain identity, deployed reference contracts, sample ownership/art and RF metadata |
| `npm audit` | Zero known dependency advisories at review time; not proof of absence of vulnerabilities |
| Source/deployment inspection | No application secret, private key or transaction path found in reviewed code; public output is seven static files without fixture/guest routes |

Contract checks establish that the referenced public interfaces respond; they
do not audit Rare Friends contracts or test real RF payments. Browser wallet/RPC
fixtures exercise error conditions without signing. A human-wallet playthrough
and independent security assessment remain unverified.
