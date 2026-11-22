# Token Radar

[![token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/c/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/aww17/token-radar-01/rank.svg)](https://make.fun/c/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/aww17/token-radar-01/reward.svg)](https://make.fun/c/token-radar-01)

A static web dashboard ranking protocols that record no token by their implied launch value. Entry for the [token-radar-01](https://make.fun/c/token-radar-01) bounty on make.fun.

## What it does

From the 2026-11-14 DefiLlama snapshot, it scores the 40 pre-token protocols on the house watchlist and adds 160 more pre-token protocols below the watchlist floor, for a 200-row board ranked by implied value. Protocols that already trade a token are kept apart and shown as the market's own values, never mixed into the ranking. Each row carries the steps to farm the protocol before or after an issue.

## The model

`lib/model.ts` fits a global log-log model in one pass: `log(mcap)` on `log(TVL)` over the snapshot's 128 tokenized protocols, whose market cap and TVL are both reported. It reads a protocol's implied value from that fit:

- a per-sector factor from each category's median residual, shrunk toward zero when the category is small;
- a growth adjustment from the seven-day TVL change, clamped;
- a maturity adjustment from how long the protocol has run with no token (a fixed age when unknown).

The implied value is the protocol's TVL times the sector multiple times those two adjustments. Only snapshot figures feed it — no protocol name is special-cased. The model was checked out of sample (5-fold CV and a temporal split) and the validated figures are stated in the source.

## Run it

Requires Node 22 with no dependencies installed. From this repository:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input /input/snapshot.json
```

It writes `board.json`, `data.js` and `dossier.json` into `out/`, and copies `dashboard/` and `screenshots/` there. In the grader's container `/output` stands in for `out/`.

## The dashboard

`dashboard/` is a static page (`index.html`, `app.css`, `app.js`) that reads `data.js` beside it. It works offline: sort, filter and open a protocol's detail view, with no network calls.

## License

MIT — see [LICENSE](LICENSE).
