// Shared helpers: data loading, statistics, chart setup.
const DATA_URL = 'data/player_games.csv';
const MONTHS = {'10':'Oct','11':'Nov','12':'Dec','01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep'};
const COLORS = ['#2455f4','#e8344e','#f2a900','#12a77a','#8a4fff','#00a3c4','#ff7a1a','#6b7a90'];

function loadData() {
  return new Promise((resolve, reject) => {
    Papa.parse(DATA_URL, {download: true, header: true, dynamicTyping: true, skipEmptyLines: true,
      complete: r => {
        if (!r.data.length) return reject(new Error('empty file'));
        r.data.forEach(d => { d.month = String(d.date).slice(5, 7); d._p = String(d.player).toLowerCase(); });
        resolve(r.data);
      },
      error: reject});
  });
}
function showError(msg) {
  const d = document.createElement('div'); d.className = 'err';
  d.innerHTML = '<b>The data file did not load.</b> ' + msg + ' Run <code>python scripts/build_data.py</code> to create <code>data/player_games.csv</code>, then serve the folder (<code>python -m http.server</code>) or open the GitHub Pages URL.';
  document.querySelector('.wrap').prepend(d);
}
const sum = (a, f) => a.reduce((s, r) => s + (r[f] || 0), 0);
const mean = (a, f) => a.length ? sum(a, f) / a.length : NaN;
function median(a, f) {
  if (!a.length) return NaN;
  const v = a.map(r => r[f] || 0).sort((x, y) => x - y), m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
const tsPct = a => 100 * sum(a, 'pts') / (2 * (sum(a, 'fga') + 0.44 * sum(a, 'fta')));
function groupBy(rows, key) {
  const m = new Map(), kf = typeof key === 'function' ? key : r => r[key];
  for (const r of rows) { const k = kf(r); let g = m.get(k); if (!g) m.set(k, g = []); g.push(r); }
  return m;
}
// One entry per team per game: team points, threes attempted, home/away, result.
function teamGames(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = r.game_id + '|' + r.team;
    let t = m.get(k);
    if (!t) m.set(k, t = {team: r.team, season: r.season, month: String(r.date).slice(5, 7), loc: r.loc, result: r.result, pts: 0, fg3a: 0, fg3m: 0});
    t.pts += r.pts || 0; t.fg3a += r.fg3a || 0; t.fg3m += r.fg3m || 0;
  }
  return [...m.values()];
}
const fmt = (n, d = 0) => Number.isFinite(n) ? n.toLocaleString('en-US', {minimumFractionDigits: d, maximumFractionDigits: d}) : '–';

Chart.defaults.font.family = '"Public Sans",system-ui,sans-serif';
Chart.defaults.color = getComputedStyle(document.documentElement).getPropertyValue('--mute') || '#5b677a';
Chart.defaults.maintainAspectRatio = false;
function makeChart(canvas, {type = 'bar', labels, datasets, horizontal = false, legend = false, yTitle = ''}) {
  datasets.forEach((d, i) => { d.backgroundColor = d.backgroundColor || COLORS[i % COLORS.length]; d.borderColor = d.borderColor || COLORS[i % COLORS.length]; });
  return new Chart(canvas, {type, data: {labels, datasets},
    options: {indexAxis: horizontal ? 'y' : 'x', plugins: {legend: {display: legend}},
      scales: {[horizontal ? 'x' : 'y']: {title: {display: !!yTitle, text: yTitle}, beginAtZero: type !== 'line'}}}});
}
