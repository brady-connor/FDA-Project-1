# NBA Box Score Lab

A two-page data website for the Financial Data Analytics project, built on NBA player game logs.

- **Live site:** `https://YOUR-USERNAME.github.io/REPO-NAME/`
- **Data:** official NBA game logs from stats.nba.com, downloaded through the `nba_api` Python package (`LeagueGameLog`). One row = one player in one game, 2020-21 through 2025-26, regular season and playoffs.

## Files

| File | What it does |
|---|---|
| `index.html` | Report page: title, summary, headline numbers, eight findings with charts, and the closing data section. |
| `dashboard.html` | Dashboard page: filters, summary numbers, four switchable charts, table, reset button. |
| `report.js` | Computes every report number and builds its charts from the CSV in the browser. |
| `dashboard.js` | Filtering, measure and breakdown switches, charts, table and reset logic. |
| `common.js` | Shared code: CSV loading, statistics (mean, median, true shooting), chart setup. |
| `style.css` | Shared look for both pages, including the navigation bar and dark mode. |
| `scripts/build_data.py` | Downloads the Hugging Face data set, renames columns, derives win/loss, drops rows with no box score, writes the data files. |
| `data/player_games.csv` | The cleaned data set (created by the script). |
| `data/build_info.json` | Raw, kept and dropped row counts shown in the report. |

## Reproduce

```
pip install datasets pandas numpy
python scripts/build_data.py
python -m http.server 8000     # then open http://localhost:8000
```

Libraries (Chart.js, PapaParse) load from cdnjs. Publish with GitHub Pages from the `main` branch.
