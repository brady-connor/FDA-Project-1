# NBA Data Lab — Five-Season Financial Data Analytics Project

A GitHub Pages-ready two-page data website using NBA regular-season player-game logs for 2021-22 through 2025-26.

## Coverage
- 5 seasons
- 130,414 player-game rows across the five season files
- 30 NBA teams
- 26 source columns
- October 19, 2021 through April 12, 2026

## Files
- `index.html` — scrolling report with headline numbers, eight finding sections, and Data & Methods.
- `dashboard.html` — interactive dashboard.
- `dashboard.js` — loads the five Parquet season files and recalculates filters, KPIs, charts, and table in the browser.
- `styles.css` — shared site styling.
- `data/season_manifest.csv` — season-level row counts and date coverage.
- `data/source.md` — source and methodology notes.
- `submission.txt` — four-line submission template.

## Data source
`cbratkovics/nba-game-logs` on Hugging Face. One row is one player in one regular-season game. The source excludes DNP rows, playoffs, play-in, preseason, All-Star games, and the NBA Cup final.

## Dashboard
Filters include season, month, team, opponent, and location. Summary numbers, four charts, measure/breakdown switches, current-view table, and Reset All Filters recalculate from the selected data.

## GitHub Pages
Upload the contents of this folder to the root of a public GitHub repository and enable Pages from the main branch/root.
