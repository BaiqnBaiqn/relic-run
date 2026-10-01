# Vibeathon submission review

Checked October 1, 2026 against the
[official repository instructions](https://github.com/spokesz/rarefriends-vibeathon/)
and the [Fishing format reference](https://github.com/spokesz/rarefriends-vibeathon/pull/1).

## Build and documentation

| Requirement area | Relic Run implementation and evidence |
| --- | --- |
| Selected Friend and original art | Explicit owned-Friend choice; SDK canonical animated artwork drives the avatar. Missing artwork blocks entry. Browser tests assert token ID and canonical NFT wallet. |
| Ownership/network gate | SDK connection/discovery plus fresh eligibility and canonical-wallet reads; hardwired Generations generation 1+ on Robinhood chain 4663. Public URL/query cannot enable guest play. |
| SDK viewport and inputs | Public frame at most 960 × 640, with a 960 × 960 world inside. Keyboard, pointer and touch controls; scrollable camp/dialog content. Automated desktop/mobile bounds checks pass. |
| Usable states and accessibility controls | Loading and artwork/network/save errors, cancel/retry paths, pause/focus handling, mute and reduced motion. Chest/jackpot effects can be skipped without rerolling. |
| Simulated MVP | Labels show simulated/test balances. No signatures, approvals, transactions, deployed economy contracts or redeemable assets. Production requirements are documented. |
| Builder, category and project summary | Justin Walker / GitHub @BaiqnBaiqn; Economy Potential; one-sentence Rare Friends connection in submission README and prepared PR description. |
| Public source and setup | [Source](https://github.com/BaiqnBaiqn/relic-run), code, assets, notices, Node/npm setup, local dev and custom submission build commands. FriendSDK 0.1.4 and stack versions are stated. |
| Public playable demo | [GitHub Pages preview](https://baiqnbaiqn.github.io/relic-run/); ownership/mainnet requirements and simulated funds explained. No RF funding needed. |
| Rules and economy | Controls, five entry fees/caps, GEMZ ranges, all chest odds, weapon/jackpot odds, potions, death and season rules in [submission README](../submissions/relic-run/README.md). [Root README](../README.md#tokenomics-what-rf-and-gemz-do) explains incentives, accounting and limitations. |
| Credits and checks | Asset attribution, SDK version/license and reference art documented. Typecheck, validation, 84 unit tests, browser tests and read-only contract checks reported with limits. [Security review](SECURITY_REVIEW.md) records fixes and remaining risks. |

The repository uses FriendSDK 0.1.4's exported `ConnectedGameHost` and
`GameSession`, with a narrow custom simulated-save extension. The game definition
has an explicitly unused chance-adapter reference, required by the runtime;
actual economy values live in `economy.json`. The documented custom builder
packages the trusted host and sandbox child together. It preserves the public
ownership gate, canonical artwork and simulated economy. The local guest and
Genesis development entry is not part of the published directory.

## Submission status

The source and demo are public. The required submission file and matching PR
description are prepared, and the file is published on the
[submission fork branch](https://github.com/BaiqnBaiqn/rarefriends-vibeathon/tree/codex/relic-run-submission/submissions/relic-run).

**An official upstream pull request has not been created.** The creation attempt
was rejected, and GitHub displayed a repository restriction allowing only
collaborators to open pull requests. A maintainer must lift that restriction or
provide access before the prepared entry can be submitted. The
[prepared comparison](https://github.com/spokesz/rarefriends-vibeathon/compare/main...BaiqnBaiqn:rarefriends-vibeathon:codex/relic-run-submission?expand=1)
is not a submitted PR. No organizer acceptance or production approval is claimed.

The reported automated checks establish the tested behavior, not measured human
balance, compatibility with every wallet, production settlement or guaranteed
economic returns. A real human-wallet playthrough remains unverified.
