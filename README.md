# NBA Data Lab — Five-Season Financial Data Analytics Project

Public two-page data website analyzing NBA regular-season player-game logs from 2021-22 through 2025-26.

## Coverage
- 5 seasons
- 130,414 player-game rows
- 30 NBA teams
- 26 source columns
- October 19, 2021 through April 12, 2026

## Files
- `index.html` — scrolling report with four headline numbers, eight data findings, charts, and Data & Methods.
- `report.js` — loads `data/player_games.csv` and calculates the report findings/charts in the browser.
- `dashboard.html` — interactive dashboard page.
- `dashboard.js` — loads `data/player_games.csv` and recalculates filters, KPIs, charts, and table in the browser.
- `styles.css` — shared styling for both pages.
- `data/player_games.csv` — combined five-season player-game dataset used by both pages.
- `season_manifest.csv` — season-level row counts, game counts, and date coverage.
- `source.md` — source and methodology notes.
- `submission.txt` — four-line course submission file; student ID must be filled in before submission.

## Data source
Source: `cbratkovics/nba-game-logs` on Hugging Face. One row is one player in one regular-season game. The source excludes DNP rows, playoffs, play-in, preseason, All-Star games, and the NBA Cup final.

## Report
The report contains eight browser-calculated findings covering team scoring, playing time by season, home vs. road scoring, team rebounding, team assists, three-point attempts by season, field-goal attempts by season, and scoring among players with at least 200 appearances.

## Dashboard
Filters: season, month, team, opponent, and location. The page includes four changing summary numbers, four changing charts, measure and breakdown switches, a current-view table, and Reset All Filters.

## GitHub Pages
The site is published from the public repository's main branch/root.
