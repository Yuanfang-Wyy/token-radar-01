# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Yuanfang-Wyy/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Yuanfang-Wyy/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar: every protocol in a sealed DefiLlama snapshot that records no token yet, ranked by what its token launch would be worth, with a farm plan for each one — as a static dashboard you can open with no network. `main.ts` (Node 22, standard library only) ranks every pre-token protocol with the radar-2 model, which calibrates each category's token value from the snapshot itself: the median market-cap-to-TVL ratio of the live-token protocols in that category, shrunk toward the market median where a category has few comparables, then adjusted for growth, maturity and chain breadth. No protocol name is ever special-cased.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Then open `out/dashboard/index.html` in a browser (or serve `out/` over HTTP). The program runs twice in the grader and both runs write the same bytes.

## What it does

- **The board** covers the snapshot's whole 40-protocol watchlist plus every other pre-token protocol below the floor — 198 rows, each with an implied value and six farm steps that name their cost and time.
- **The dashboard** (`dashboard/`) is a static page: a sortable and filterable board, a detail view per protocol with the model breakdown and farm plan, the live-token protocols kept apart, and a model sandbox that re-ranks the board live.

## Files

- `main.ts` — the entrypoint: reads the snapshot, writes `board.json`, `data.js`, copies `dashboard/` and `screenshots/`, writes `dossier.json`.
- `lib/model.ts` — the radar-2 model, farm plans, and board validation.
- `vendor/makefun-board.ts` — the kit's dossier library, byte for byte.
- `dashboard/` — the static page: `index.html`, `app.css`, `app.js`.
- `screenshots/` — the board, a detail view, and a filtered view.

---

<sub>Entered on [make.fun](https://make.fun/?ref=j6e5645f&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
