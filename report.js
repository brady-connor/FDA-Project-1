(async () => {
  let rows;
  try { rows = await loadData(); } catch (e) { document.getElementById('summary').textContent = ''; return showError('(' + e.message + ')'); }
    const reg = rows; // the data set holds regular-season games only
  const seasons = [...new Set(rows.map(r => r.season))].sort();
  const first = seasons[0], last = seasons.at(-1);
  const TG = teamGames(rows), TGreg = TG;
  const players = new Set(rows.map(r => r.player_id)), games = new Set(rows.map(r => r.game_id));
  const teams = new Set(rows.map(r => r.team));
  const pct = (a, b) => 100 * (b - a) / a;

  // Summary and headline numbers
  document.getElementById('summary').textContent =
    `This report covers every NBA player-game from ${first} through ${last}: ${fmt(rows.length)} box-score lines for ${fmt(players.size)} players on ${teams.size} teams, all from the regular season. ` +
    `It tracks how scoring and three-point volume changed, who led the league, how much home court matters, and how scoring changes through the months of the season.`;
  const headline = [
    [fmt(rows.length), 'player-games in the data'],
    [fmt(players.size), 'different players'],
    [fmt(games.size), 'games played'],
    [fmt(sum(rows, 'pts')), 'total points scored'],
    [fmt(sum(rows, 'fg3m')), 'three-pointers made']];
  document.getElementById('stats').innerHTML = headline.map(h => `<div class="stat"><b>${h[0]}</b><span>${h[1]}</span></div>`).join('');

  const sections = [];
  const bySeason = (list, f) => { const g = groupBy(list, 'season'); return seasons.map(s => g.has(s) ? f(g.get(s)) : null); };

  // 1. Team scoring by season
  { const v = bySeason(TGreg, a => mean(a, 'pts')), a = v.find(x => x != null), b = [...v].reverse().find(x => x != null);
    sections.push({h: `Teams scored ${fmt(b, 1)} points per game in ${last}, ${b >= a ? 'up' : 'down'} ${fmt(Math.abs(pct(a, b)), 1)}% from ${first}`,
      p: [`Averaged over every regular-season team-game, scoring moved from ${fmt(a, 1)} points in ${first} to ${fmt(b, 1)} in ${last}. The peak season was ${seasons[v.indexOf(Math.max(...v.filter(x => x != null)))]} at ${fmt(Math.max(...v.filter(x => x != null)), 1)}.`],
      chart: {type: 'line', labels: seasons, datasets: [{label: 'Points per team-game', data: v}], yTitle: 'Points'}}); }

  // 2. Three-point volume
  { const v = bySeason(TGreg, a => mean(a, 'fg3a')), m = bySeason(TGreg, a => 100 * sum(a, 'fg3m') / sum(a, 'fg3a')),
      a = v.find(x => x != null), b = [...v].reverse().find(x => x != null), mb = [...m].reverse().find(x => x != null);
    sections.push({h: `Teams attempted ${fmt(b, 1)} threes per game in ${last}, ${b >= a ? 'up' : 'down'} ${fmt(Math.abs(pct(a, b)), 1)}% since ${first}`,
      p: [`The average team took ${fmt(a, 1)} three-point attempts per game in ${first} and ${fmt(b, 1)} in ${last}. Accuracy on those shots in ${last} was ${fmt(mb, 1)}%, computed as total threes made divided by total attempts.`],
      chart: {type: 'bar', labels: seasons, datasets: [{label: '3-point attempts per team-game', data: v}], yTitle: 'Attempts'}}); }

  // 3. Top scorers in the latest season
  { const g = [...groupBy(reg.filter(r => r.season === last), 'player')].filter(([, a]) => a.length >= 40)
      .map(([n, a]) => [n, mean(a, 'pts'), a.length]).sort((x, y) => y[1] - x[1]).slice(0, 10);
    if (g.length) sections.push({h: `${g[0][0]} led ${last} scoring at ${fmt(g[0][1], 1)} points per game`,
      p: [`Among players with at least 40 regular-season games, ${g[0][0]} averaged ${fmt(g[0][1], 1)} points over ${g[0][2]} games. The tenth-ranked scorer, ${g[9] ? g[9][0] : g.at(-1)[0]}, averaged ${fmt((g[9] || g.at(-1))[1], 1)}.`],
      chart: {type: 'bar', horizontal: true, labels: g.map(x => x[0]), datasets: [{label: 'Points per game', data: g.map(x => x[1])}]}}); }

  // 4. Home-court advantage
  { const home = TGreg.filter(t => t.loc === 'H'), w = home.filter(t => t.result === 'W').length;
    const v = bySeason(home, a => 100 * a.filter(t => t.result === 'W').length / a.length);
    sections.push({h: `Home teams won ${fmt(100 * w / home.length, 1)}% of regular-season games`,
      p: [`Across ${fmt(home.length)} regular-season games, the home team won ${fmt(w)}. By season the home win rate ranged from ${fmt(Math.min(...v.filter(x => x != null)), 1)}% to ${fmt(Math.max(...v.filter(x => x != null)), 1)}%. Each game has exactly one home team, so a 50% line would mean no home edge.`],
      chart: {type: 'line', labels: seasons, datasets: [{label: 'Home win %', data: v}], yTitle: 'Win %'}}); }

  // 5. Most wins
  { const g = [...groupBy(TGreg, 'team')].map(([t, a]) => [t, a.filter(x => x.result === 'W').length, a.length]).sort((x, y) => y[1] - x[1]).slice(0, 10);
    sections.push({h: `${g[0][0]} won the most regular-season games: ${g[0][1]} of ${g[0][2]} since ${first}`,
      p: [`Ranked by total regular-season wins across ${seasons.length} seasons, ${g[0][0]} leads with a ${fmt(100 * g[0][1] / g[0][2], 1)}% win rate. ${g[1][0]} is second with ${g[1][1]} wins (${fmt(100 * g[1][1] / g[1][2], 1)}%).`],
      chart: {type: 'bar', labels: g.map(x => x[0]), datasets: [{label: 'Regular-season wins', data: g.map(x => x[1])}]}}); }

  // 6. Efficiency leaders
  { const g = [...groupBy(reg.filter(r => r.season === last), 'player')].filter(([, a]) => a.length >= 40 && mean(a, 'pts') >= 15)
      .map(([n, a]) => [n, tsPct(a), mean(a, 'pts')]).sort((x, y) => y[1] - x[1]).slice(0, 10);
    if (g.length) sections.push({h: `${g[0][0]} was the most efficient high-volume scorer in ${last} at ${fmt(g[0][1], 1)}% true shooting`,
      p: [`Limiting to players with 40+ games and 15+ points per game, ${g[0][0]} scored ${fmt(g[0][2], 1)} per game at ${fmt(g[0][1], 1)}% true shooting, which credits threes and free throws properly. The league-wide figure for ${last} regular-season player-games is ${fmt(tsPct(reg.filter(r => r.season === last)), 1)}%.`],
      chart: {type: 'bar', horizontal: true, labels: g.map(x => x[0]), datasets: [{label: 'True shooting %', data: g.map(x => x[1])}]}}); }

  // 7. Scoring by month of the season
  { const g = groupBy(TGreg, 'month'), keys = Object.keys(MONTHS).filter(k => g.has(k));
    const v = keys.map(k => mean(g.get(k), 'pts')), hi = v.indexOf(Math.max(...v)), lo = v.indexOf(Math.min(...v));
    sections.push({h: `Scoring peaked in ${MONTHS[keys[hi]]} at ${fmt(v[hi], 1)} points per team-game and bottomed out in ${MONTHS[keys[lo]]} at ${fmt(v[lo], 1)}`,
      p: [`Grouping every team-game by calendar month across all ${seasons.length} seasons, average team scoring ranges from ${fmt(v[lo], 1)} to ${fmt(v[hi], 1)} points, a gap of ${fmt(v[hi] - v[lo], 1)}. Months with few games (such as April) rest on fewer team-games, so treat their averages with more caution.`],
      chart: {type: 'line', labels: keys.map(k => MONTHS[k]), datasets: [{label: 'Points per team-game', data: v}], yTitle: 'Points'}}); }

  // 8. Triple-doubles
  { const td = r => r.pts >= 10 && r.reb >= 10 && r.ast >= 10;
    const v = bySeason(reg, a => a.filter(td).length), mx = Math.max(...v.filter(x => x != null)), best = seasons[v.indexOf(mx)];
    const leader = [...groupBy(reg.filter(td), 'player')].map(([n, a]) => [n, a.length]).sort((x, y) => y[1] - x[1])[0];
    sections.push({h: `Triple-doubles peaked at ${mx} in ${best}`,
      p: [`Counting regular-season player-games with 10+ points, rebounds and assists, there were ${v[v.length - 1]} in ${last}. ${leader ? leader[0] + ' recorded the most across the whole period with ' + leader[1] + '.' : ''}`],
      chart: {type: 'bar', labels: seasons, datasets: [{label: 'Triple-doubles', data: v}]}}); }

  const host = document.getElementById('sections');
  sections.forEach(s => {
    const el = document.createElement('section'); el.className = 'card';
    el.innerHTML = `<h2>${s.h}</h2>${s.p.map(t => `<p>${t}</p>`).join('')}<div class="chartbox"><canvas></canvas></div>`;
    host.appendChild(el);
    makeChart(el.querySelector('canvas'), s.chart);
  });

  document.getElementById('rowinfo').textContent = `The file has ${fmt(rows.length)} rows and ${Object.keys(rows[0]).filter(k => k !== 'month' && k !== '_p').length} columns, covering ${seasons.length} seasons and ${players.size} players.`;
  try {
    const info = await (await fetch('data/build_info.json')).json();
    document.getElementById('dropinfo').textContent = `The download had ${fmt(info.raw_rows)} rows; ${fmt(info.dropped_rows)} were dropped and ${fmt(info.kept_rows)} kept.`;
  } catch (e) { /* build_info.json is optional */ }
})();
