(async () => {
  let rows;
  try { rows = await loadData(); } catch (e) { document.getElementById('status').textContent = ''; return showError('(' + e.message + ')'); }
  document.getElementById('status').textContent = `${fmt(rows.length)} player-games loaded. Change any filter and every number, chart and table updates.`;

  const seasons = [...new Set(rows.map(r => r.season))].sort();
  const teams = [...new Set(rows.map(r => r.team))].sort();

  // Measures the reader can switch between
  const M = {
    games:    {l: 'Player-games', f: a => a.length, add: 1, d: 0},
    pts_tot:  {l: 'Total points', f: a => sum(a, 'pts'), add: 1, d: 0},
    pts_avg:  {l: 'Average points', f: a => mean(a, 'pts'), d: 1},
    pts_med:  {l: 'Median points', f: a => median(a, 'pts'), d: 1},
    reb_avg:  {l: 'Average rebounds', f: a => mean(a, 'reb'), d: 1},
    ast_avg:  {l: 'Average assists', f: a => mean(a, 'ast'), d: 1},
    fg3_avg:  {l: 'Average threes made', f: a => mean(a, 'fg3m'), d: 2},
    fg_pct:   {l: 'Field goal %', f: a => 100 * sum(a, 'fgm') / sum(a, 'fga'), d: 1},
    ts_pct:   {l: 'True shooting %', f: tsPct, d: 1},
    win_rate: {l: 'Win rate %', f: a => 100 * a.filter(r => r.result === 'W').length / a.length, d: 1}};
  // Variables the reader can break a chart down by
  const monthOrder = ['10','11','12','01','02','03','04','05','06','07','08','09'];
  const B = {
    season:      {l: 'Season', k: r => r.season, time: 1},
    month:       {l: 'Month', k: r => r.month, lab: k => MONTHS[k] || k, time: 1, ord: k => monthOrder.indexOf(k)},
    team:        {l: 'Team', k: r => r.team},
    opponent:    {l: 'Opponent', k: r => r.opponent},
    player:      {l: 'Player', k: r => r.player},
    loc:         {l: 'Home / Away', k: r => r.loc, lab: k => k === 'H' ? 'Home' : 'Away'},
    result:      {l: 'Result', k: r => r.result, lab: k => k === 'W' ? 'Win' : 'Loss'},
  };

  const opt = (o, sel) => Object.entries(o).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v.l}</option>`).join('');
  const list = (arr, all = 'All') => `<option value="">${all}</option>` + arr.map(x => `<option>${x}</option>`).join('');

  // Filters
  const F = document.getElementById('filters');
  F.innerHTML = `
    <label>Season<select id="f_season">${list(seasons)}</select></label>
    <label>Team<select id="f_team">${list(teams)}</select></label>
    <label>Opponent<select id="f_opp">${list(teams)}</select></label>
    <label>Home / Away<select id="f_loc"><option value="">All</option><option value="H">Home</option><option value="A">Away</option></select></label>
    <label>Result<select id="f_res"><option value="">All</option><option value="W">Win</option><option value="L">Loss</option></select></label>
    <label>Player name<input id="f_player" type="search" placeholder="e.g. Jokić"></label>
    <label>Min rows per group<input id="f_min" type="number" min="1" value="20"></label>
    <button id="reset" type="button">Reset filters</button>`;
  const $ = id => document.getElementById(id);
  const DEFAULT_MIN = 20;

  // Chart cards: each has its own measure and breakdown switch
  const specs = [
    {type: 'line', m: 'pts_avg', b: 'season'},
    {type: 'bar', m: 'pts_tot', b: 'team'},
    {type: 'bar', m: 'pts_avg', b: 'player', horizontal: true},
    {type: 'bar', m: 'win_rate', b: 'loc'}];
  const grid = $('charts');
  specs.forEach((s, i) => {
    const d = document.createElement('div'); d.className = 'cc';
    d.innerHTML = `<div class="ctl"><label>Measure<select id="m${i}">${opt(M, s.m)}</select></label>
      <label>Broken down by<select id="b${i}">${opt(B, s.b)}</select></label></div>
      <div class="chartbox"><canvas></canvas></div>`;
    grid.appendChild(d);
    s.chart = makeChart(d.querySelector('canvas'), {type: s.type, labels: [], datasets: [{label: '', data: []}], horizontal: s.horizontal});
  });

  // Table
  $('tableBy').innerHTML = opt(B, 'team');
  const cols = [['Group', null], ['Player-games', 'games'], ['Total pts', 'pts_tot'], ['Avg pts', 'pts_avg'], ['Avg reb', 'reb_avg'], ['Avg ast', 'ast_avg'], ['TS %', 'ts_pct'], ['Win %', 'win_rate']];
  let sortKey = 'games';

  function aggregate(data, by, mk, minN) {
    const b = B[by], m = M[mk], lab = b.lab || (k => k);
    let out = [...groupBy(data, b.k)].filter(([, a]) => m.add || a.length >= minN).map(([k, a]) => ({k, label: lab(k), v: m.f(a)}));
    if (b.time) out.sort((x, y) => b.ord ? b.ord(x.k) - b.ord(y.k) : String(x.k).localeCompare(String(y.k)));
    else out = out.sort((x, y) => y.v - x.v).slice(0, 15);
    return out;
  }

  function render() {
    const f = {s: $('f_season').value, t: $('f_team').value, o: $('f_opp').value, l: $('f_loc').value, r: $('f_res').value,
      p: $('f_player').value.trim().toLowerCase()};
    const minN = Math.max(1, +$('f_min').value || 1);
    const data = rows.filter(r => (!f.s || r.season === f.s) && (!f.t || r.team === f.t) && (!f.o || r.opponent === f.o) &&
      (!f.l || r.loc === f.l) && (!f.r || r.result === f.r) && (!f.p || r._p.includes(f.p)));

    // Summary numbers
    const sm = [[fmt(data.length), 'player-games'], [fmt(new Set(data.map(r => r.player_id)).size), 'players'], [fmt(sum(data, 'pts')), 'total points'],
      [fmt(mean(data, 'pts'), 1), 'points per game'], [fmt(mean(data, 'reb'), 1), 'rebounds per game'], [fmt(mean(data, 'ast'), 1), 'assists per game'],
      [data.length ? fmt(tsPct(data), 1) + '%' : '–', 'true shooting']];
    $('stats').innerHTML = sm.map(x => `<div class="stat"><b>${x[0]}</b><span>${x[1]}</span></div>`).join('');

    // Charts
    specs.forEach((s, i) => {
      const mk = $('m' + i).value, by = $('b' + i).value, res = aggregate(data, by, mk, minN);
      const d = s.chart.data; d.labels = res.map(x => x.label);
      d.datasets[0].data = res.map(x => x.v);
      d.datasets[0].label = `${M[mk].l} by ${B[by].l.toLowerCase()}`;
      s.chart.options.plugins.legend.display = true;
      s.chart.update();
    });

    // Table
    const by = $('tableBy').value, groups = [...groupBy(data, B[by].k)].filter(([, a]) => a.length >= minN)
      .map(([k, a]) => ({label: (B[by].lab || (x => x))(k), games: a.length, pts_tot: sum(a, 'pts'), pts_avg: mean(a, 'pts'), reb_avg: mean(a, 'reb'),
        ast_avg: mean(a, 'ast'), ts_pct: tsPct(a), win_rate: M.win_rate.f(a)}))
      .sort((x, y) => y[sortKey] - x[sortKey]);
    $('thead').innerHTML = '<tr>' + cols.map(c => `<th data-k="${c[1] || ''}"${c[1] === sortKey ? ' class="s"' : ''}>${c[0]}</th>`).join('') + '</tr>';
    $('tbody').innerHTML = groups.slice(0, 100).map(g => `<tr><td>${g.label}</td><td>${fmt(g.games)}</td><td>${fmt(g.pts_tot)}</td><td>${fmt(g.pts_avg, 1)}</td><td>${fmt(g.reb_avg, 1)}</td><td>${fmt(g.ast_avg, 1)}</td><td>${fmt(g.ts_pct, 1)}</td><td>${fmt(g.win_rate, 1)}</td></tr>`).join('');
    $('tnote').textContent = `${groups.length} groups with at least ${minN} rows${groups.length > 100 ? ' (showing the first 100)' : ''}. Click a column heading to sort.`;
  }

  let timer;
  document.addEventListener('input', e => { if (e.target.id === 'f_player' || e.target.id === 'f_min') { clearTimeout(timer); timer = setTimeout(render, 200); } });
  document.addEventListener('change', e => { if (e.target.tagName === 'SELECT') render(); });
  $('thead').addEventListener('click', e => { const k = e.target.dataset.k; if (k) { sortKey = k; render(); } });
  $('reset').addEventListener('click', () => {
    ['f_season', 'f_team', 'f_opp', 'f_loc', 'f_res'].forEach(id => $(id).value = '');
    $('f_player').value = ''; $('f_min').value = DEFAULT_MIN; render();
  });
  render();
})();
