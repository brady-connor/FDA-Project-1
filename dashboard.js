import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm';
const $=id=>document.getElementById(id);
const FILES=[
 ['2021-22','https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2021-22.parquet'],
 ['2022-23','https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2022-23.parquet'],
 ['2023-24','https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2023-24.parquet'],
 ['2024-25','https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2024-25.parquet'],
 ['2025-26','https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2025-26.parquet']
];
let db,con; const fmt=(n,d=1)=>Number(n).toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});
async function start(){try{
 const bundles=duckdb.getJsDelivrBundles(), bundle=await duckdb.selectBundle(bundles);
 const worker=new Worker(URL.createObjectURL(new Blob([`importScripts("${bundle.mainWorker}");`],{type:'text/javascript'})));
 db=new duckdb.AsyncDuckDB(new duckdb.ConsoleLogger(),worker); await db.instantiate(bundle.mainModule,bundle.pthreadWorker);
 for(const [season,url] of FILES) await db.registerFileURL(`${season}.parquet`,url,duckdb.DuckDBDataProtocol.HTTP,false);
 con=await db.connect();
 await con.query(`CREATE VIEW logs AS SELECT *, strftime(game_date,'%Y-%m') month FROM read_parquet(['2021-22.parquet','2022-23.parquet','2023-24.parquet','2024-25.parquet','2025-26.parquet'])`);
 for(const d of ['season','month','team','opponent']){const q=await con.query(`SELECT DISTINCT ${d} v FROM logs ORDER BY 1`);$(d).innerHTML=`<option value="ALL">All ${d==='month'?'months':d==='season'?'seasons':d+'s'}</option>`+q.toArray().map(r=>`<option>${r.v}</option>`).join('')}
 ['season','month','team','opponent','home','measure','breakdown'].forEach(x=>$(x).onchange=render);
 $('reset').onclick=()=>{['season','month','team','opponent','home'].forEach(x=>$(x).value='ALL');$('measure').value='pts';$('breakdown').value='team';render()};
 $('status').textContent='Data loaded: 2021–22 through 2025–26 regular seasons.'; await render();
}catch(e){$('status').textContent='Data load error: '+e.message;console.error(e)}}
function where(){const a=[];for(const d of ['season','month','team','opponent'])if($(d).value!=='ALL')a.push(`${d}='${$(d).value.replaceAll("'","''")}'`);if($('home').value!=='ALL')a.push(`home=${$('home').value}`);return a.length?' WHERE '+a.join(' AND '):''}
function expr(){const m=$('measure').value;return m==='count'?'COUNT(*)':`AVG(${m})`}
async function groups(dim){const q=await con.query(`SELECT ${dim} label,COUNT(*) AS n,AVG(pts) AS pts,AVG(reb) AS reb,AVG(ast) AS ast,AVG(minutes) AS minutes,${expr()} AS value FROM logs${where()} GROUP BY 1 ORDER BY value DESC`);return q.toArray().map(r=>Object.fromEntries(Object.entries(r).map(([k,v])=>[k,typeof v==='bigint'?Number(v):v])))}
function bars(el,a){const max=Math.max(...a.map(x=>+x.value||0),1);el.innerHTML=`<div class="bars">${a.slice(0,15).map(x=>`<div class="barcol"><div class="bar" style="height:${(+x.value/max)*220}px"><span>${fmt(x.value,$('measure').value==='count'?0:1)}</span></div><div class="barlabel">${x.label===true?'Home':x.label===false?'Road':x.label}</div></div>`).join('')}</div>`}
async function render(){const w=where();const q=await con.query(`SELECT COUNT(*) AS n,AVG(pts) AS pts,AVG(reb) AS reb,AVG(ast) AS ast FROM logs${w}`),r=q.toArray()[0];$('kRows').textContent=Number(r.n).toLocaleString();$('kPts').textContent=fmt(r.pts);$('kReb').textContent=fmt(r.reb);$('kAst').textContent=fmt(r.ast);const dim=$('breakdown').value,a=await groups(dim);$('t1').textContent=`${$('measure').selectedOptions[0].text} by ${$('breakdown').selectedOptions[0].text}`;bars($('chart1'),a);bars($('chart2'),await groups('season'));bars($('chart3'),await groups('team'));bars($('chart4'),await groups('home'));$('tbody').innerHTML=a.slice(0,50).map(x=>`<tr><td>${x.label===true?'Home':x.label===false?'Road':x.label}</td><td>${fmt(x.n,0)}</td><td>${fmt(x.pts)}</td><td>${fmt(x.reb)}</td><td>${fmt(x.ast)}</td><td>${fmt(x.minutes)}</td></tr>`).join('')}
start();