const PARQUETS = [
  'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2021-22.parquet',
  'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2022-23.parquet',
  'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2023-24.parquet',
  'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2024-25.parquet',
  'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2025-26.parquet'
];

const $ = id => document.getElementById(id);
let db, conn;

async function getDuck() {
  const duckdb = await import('https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm');
  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(new Blob(
    [`importScripts("${bundle.mainWorker}");`],
    { type: 'text/javascript' }
  ));
  db = new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(), new Worker(workerUrl));
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
}

function esc(v) { return String(v).replaceAll("'", "''"); }
function num(v, d=1) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d}) : '—';
}
function setOptions(id, values, first) {
  const el = $(id);
  el.innerHTML = `<option value="ALL">${first}</option>` +
    values.map(v => `<option value="${String(v).replaceAll('"','&quot;')}">${v}</option>`).join('');
}
function whereSQL() {
  const f = ['1=1'];
  if ($('season').value !== 'ALL') f.push(`season='${esc($('season').value)}'`);
  if ($('month').value !== 'ALL') f.push(`strftime(game_date,'%Y-%m')='${esc($('month').value)}'`);
  if ($('team').value !== 'ALL') f.push(`team='${esc($('team').value)}'`);
  if ($('opponent').value !== 'ALL') f.push(`opponent='${esc($('opponent').value)}'`);
  if ($('home').value !== 'ALL') f.push(`home=${$('home').value}`);
  return f.join(' AND ');
}
function metricSQL() {
  return $('measure').value === 'count' ? 'COUNT(*)' : `AVG(${$('measure').value})`;
}
function breakdownSQL() {
  return {
    team:'team',
    opponent:'opponent',
    month:"strftime(game_date,'%Y-%m')",
    home:"CASE WHEN home THEN 'Home' ELSE 'Road' END"
  }[$('breakdown').value];
}
function renderBars(id, rows, labelKey='label', valueKey='value') {
  const el = $(id);
  if (!rows.length) { el.innerHTML='<p class="muted">No rows match these filters.</p>'; return; }
  const vals = rows.map(r => Number(r[valueKey]) || 0);
  const max = Math.max(...vals, 1);
  el.innerHTML = '<div class="bars">' + rows.map((r,i) => {
    const h = Math.max(2, (vals[i] / max) * 220);
    return `<div class="barcol"><div class="bar" style="height:${h}px"><span>${num(vals[i])}</span></div><div class="barlabel" title="${r[labelKey]}">${r[labelKey]}</div></div>`;
  }).join('') + '</div>';
}
async function grouped(expr, limit=20) {
  const q = await conn.query(`
    SELECT ${expr} AS label, ${metricSQL()} AS value
    FROM logs
    WHERE ${whereSQL()}
    GROUP BY 1
    ORDER BY value DESC
    LIMIT ${limit}
  `);
  return q.toArray();
}
async function update() {
  $('status').textContent = 'Updating dashboard…';
  const w = whereSQL();

  const sQ = await conn.query(`
    SELECT COUNT(*) AS row_count,
           AVG(pts) AS avg_pts,
           AVG(reb) AS avg_reb,
           AVG(ast) AS avg_ast
    FROM logs WHERE ${w}
  `);
  const s = sQ.get(0);
  $('kRows').textContent = Number(s.row_count || 0).toLocaleString();
  $('kPts').textContent = num(s.avg_pts);
  $('kReb').textContent = num(s.avg_reb);
  $('kAst').textContent = num(s.avg_ast);

  const b = breakdownSQL();
  $('t1').textContent = `${$('measure').selectedOptions[0].text} by ${$('breakdown').selectedOptions[0].text}`;
  renderBars('chart1', await grouped(b));
  renderBars('chart2', await grouped("strftime(game_date,'%Y-%m')", 24));
  renderBars('chart3', await grouped('team', 30));
  renderBars('chart4', await grouped("CASE WHEN home THEN 'Home' ELSE 'Road' END", 2));

  const tableQ = await conn.query(`
    SELECT ${b} AS group_name,
           COUNT(*) AS row_count,
           AVG(pts) AS avg_pts,
           AVG(reb) AS avg_reb,
           AVG(ast) AS avg_ast,
           AVG(minutes) AS avg_min
    FROM logs
    WHERE ${w}
    GROUP BY 1
    ORDER BY row_count DESC
    LIMIT 50
  `);
  $('tbody').innerHTML = tableQ.toArray().map(r => `
    <tr><td>${r.group_name}</td><td>${Number(r.row_count).toLocaleString()}</td>
    <td>${num(r.avg_pts)}</td><td>${num(r.avg_reb)}</td><td>${num(r.avg_ast)}</td><td>${num(r.avg_min)}</td></tr>
  `).join('');

  $('status').textContent = 'Live • 130,414 player-game rows available';
}
async function init() {
  try {
    $('status').textContent = 'Loading NBA data…';
    await getDuck();
    conn = await db.connect();
    await conn.query(`
      CREATE OR REPLACE VIEW logs AS
      SELECT * FROM read_parquet([${PARQUETS.map(u => `'${u}'`).join(',')}]);
    `);

    const dims = await conn.query(`
      SELECT
        list_sort(list_distinct(list(season))) AS seasons,
        list_sort(list_distinct(list(team))) AS teams,
        list_sort(list_distinct(list(opponent))) AS opponents,
        list_sort(list_distinct(list(strftime(game_date,'%Y-%m')))) AS months
      FROM logs
    `);
    const d = dims.get(0);
    setOptions('season', d.seasons, 'All seasons');
    setOptions('month', d.months, 'All months');
    setOptions('team', d.teams, 'All teams');
    setOptions('opponent', d.opponents, 'All opponents');

    document.querySelectorAll('.controls select').forEach(el => el.addEventListener('change', update));
    $('reset').addEventListener('click', () => {
      ['season','month','team','opponent','home'].forEach(id => $(id).value='ALL');
      $('measure').value='pts';
      $('breakdown').value='team';
      update();
    });
    await update();
  } catch (e) {
    console.error(e);
    $('status').textContent = 'Data load error: ' + e.message;
  }
}
init();
