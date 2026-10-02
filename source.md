# Data source

Source: cbratkovics/nba-game-logs on Hugging Face.

This project uses five NBA regular-season player-game season files: 2021-22 through 2025-26. They were combined into `data/player_games.csv`, which contains 130,414 player-game rows across 30 NBA teams and 26 source columns. Coverage runs from 2021-10-19 through 2026-04-12.

One row represents one player in one regular-season game. DNP rows are excluded by the source. Playoffs, play-in, preseason, All-Star games, and the NBA Cup final are excluded.

Both `index.html` (through `report.js`) and `dashboard.html` (through `dashboard.js`) load the same CSV and calculate their displayed averages from the matching player-game rows in the browser.
