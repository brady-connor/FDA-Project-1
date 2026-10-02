const PARQUETS=[
'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2021-22.parquet',
'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2022-23.parquet',
'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2023-24.parquet',
'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2024-25.parquet',
'https://huggingface.co/datasets/cbratkovics/nba-game-logs/resolve/main/game_logs/game_logs_2025-26.parquet'
];

let db,conn,charts={};

const $=id=>document.getElementById(id);

const fmt=(n,d=1)=>Number(n||0).toLocaleString(undefined,{
  maximumFractionDigits:d,
  minimumFractionDigits:d
});

function chartOpts(){
  return{
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{
        labels:{
          color:'#9aa5b5',
          font:{size:10},
          boxWidth:10
        }
      }
    },
    scales:{
      x:{
        ticks:{color:'#7f8998',font:{size:9}},
        grid:{color:'rgba(255,255,255,.05)'}
      },
      y:{
        ticks:{color:'#7f8998',font:{size:9}},
        grid:{color:'rgba(255,255,255,.05)'}
      }
    }
  };
}

async function getDuck(){
  const duckdb=await import(
    'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/+esm'
  );

  const bundles=duckdb.getJsDelivrBundles();
  const bundle=await duckdb.selectBundle(bundles);

  const workerUrl=URL.createObjectURL(
    new Blob(
      [`importScripts("${bundle.mainWorker}");`],
      {type:'text/javascript'}
    )
  );

  const worker=new Worker(workerUrl);
  db=new duckdb.AsyncDuckDB(
    new duckdb.ConsoleLogger(),
    worker
  );

  await db.instantiate(
    bundle.mainModule,
    bundle.pthreadWorker
  );

  return db;
}

function opts(id,vals,first){
  $(id).innerHTML=
    `<option value="all">${first}</option>`+
    vals.map(v=>`<option value="${v}">${v}</option>`).join('');
}

function filterSQL(){
  const f=[`1=1`];

  if($('seasonFilter').value!='all')
    f.push(`season='${$('seasonFilter').value}'`);

  if($('teamFilter').value!='all')
    f.push(`team='${$('teamFilter').value}'`);

  if($('oppFilter').value!='all')
    f.push(`opponent='${$('oppFilter').value}'`);

  if($('playerFilter').value!='all')
    f.push(
      `player_name='${$('playerFilter').value.replaceAll("'","''")}'`
    );

  if($('homeFilter').value!='all')
    f.push(
      $('homeFilter').value==='home'
      ? `home=true`
      : `home=false`
    );

  return f.join(' AND ');
}

function measure(){
  return $('measureFilter').value;
}

function measureLabel(){
  return $('measureFilter').selectedOptions[0].text;
}

function breakdown(){
  return $('breakdownFilter').value;
}

function breakdownSQL(){
  return {
    season:'season',
    team:'team',
    opponent:'opponent',
    player:'player_name',
    home:`CASE WHEN home THEN 'Home' ELSE 'Road' END`
  }[breakdown()];
}

async function update(){
  if(!conn)return;

  const where=filterSQL();
  const m=measure();
  const b=breakdownSQL();

  $('loadStatus').textContent='Updating view…';

  const summary=await conn.query(`
    SELECT
      COUNT(*) AS row_count,
      AVG(pts) AS avg_pts,
      AVG(reb) AS avg_reb,
      AVG(ast) AS avg_ast,
      AVG(minutes) AS avg_min
    FROM logs
    WHERE ${where}
  `);

  const s=summary.get(0);

  $('mRows').textContent=
    Number(s.row_count).toLocaleString();

  $('mPts').textContent=fmt(s.avg_pts);
  $('mReb').textContent=fmt(s.avg_reb);
  $('mAst').textContent=fmt(s.avg_ast);
  $('mMin').textContent=fmt(s.avg_min);

  $('viewTitle').textContent=
    `${measureLabel()} by ${
      $('breakdownFilter').selectedOptions[0].text
    }`;

  $('viewSummary').textContent=
    `${Number(s.row_count).toLocaleString()} player-games match your filters`;

  const q1=await conn.query(`
    SELECT
      ${b} AS label,
      AVG(${m}) AS metric_value
    FROM logs
    WHERE ${where}
    GROUP BY 1
    ORDER BY metric_value DESC
    LIMIT 20
  `);

  const q2=await conn.query(`
    SELECT
      AVG(pts) AS avg_pts,
      AVG(reb) AS avg_reb,
      AVG(ast) AS avg_ast,
      AVG(minutes) AS avg_min
    FROM logs
    WHERE ${where}
  `);

  const q3=await conn.query(`
    SELECT
      CASE
        WHEN pts<10 THEN '0-9'
        WHEN pts<20 THEN '10-19'
        WHEN pts<30 THEN '20-29'
        WHEN pts<40 THEN '30-39'
        ELSE '40+'
      END AS point_bucket,
      COUNT(*) AS game_count
    FROM logs
    WHERE ${where}
    GROUP BY 1
    ORDER BY MIN(pts)
  `);

  const q4=await conn.query(`
    SELECT
      game_date,
      AVG(${m}) AS metric_value
    FROM logs
    WHERE ${where}
    GROUP BY game_date
    ORDER BY game_date DESC
    LIMIT 30
  `);

  const tableRows=await conn.query(`
    SELECT
      game_date,
      player_name,
      team,
      opponent,
      CASE
        WHEN home THEN 'Home'
        ELSE 'Road'
      END AS location,
      minutes,
      pts,
      reb,
      ast,
      plus_minus
    FROM logs
    WHERE ${where}
    ORDER BY game_date DESC
    LIMIT 50
  `);

  Object.values(charts).forEach(c=>c.destroy());

  charts.one=new Chart(
    $('dashChart1'),
    {
      type:breakdown()==='home'?'doughnut':'bar',
      data:{
        labels:q1.toArray().map(r=>r.label),
        datasets:[{
          label:measureLabel(),
          data:q1.toArray().map(r=>r.metric_value),
          backgroundColor:'#ff6a00',
          borderRadius:4
        }]
      },
      options:breakdown()==='home'
        ?{
          responsive:true,
          maintainAspectRatio:false,
          plugins:{
            legend:{
              labels:{color:'#9aa5b5'}
            }
          }
        }
        :{
          ...chartOpts(),
          indexAxis:breakdown()==='team'?'y':'x'
        }
    }
  );

  const x=q2.get(0);

  charts.two=new Chart(
    $('dashChart2'),
    {
      type:'bar',
      data:{
        labels:['Points','Rebounds','Assists','Minutes'],
        datasets:[{
          label:'Average',
          data:[
            x.avg_pts,
            x.avg_reb,
            x.avg_ast,
            x.avg_min
          ],
          backgroundColor:[
            '#ff6a00',
            '#49d7ff',
            '#8b7cff',
            '#c3cad5'
          ],
          borderRadius:5
        }]
      },
      options:chartOpts()
    }
  );

  charts.three=new Chart(
    $('dashChart3'),
    {
      type:'doughnut',
      data:{
        labels:q3.toArray().map(r=>r.point_bucket),
        datasets:[{
          data:q3.toArray().map(r=>r.game_count),
          backgroundColor:[
            '#27313f',
            '#ff6a00',
            '#49d7ff',
            '#8b7cff',
            '#c3cad5'
          ]
        }]
      },
      options:{
        responsive:true,
        maintainAspectRatio:false,
        plugins:{
          legend:{
            labels:{
              color:'#9aa5b5',
              font:{size:10}
            }
          }
        }
      }
    }
  );

  charts.four=new Chart(
    $('dashChart4'),
    {
      type:'line',
      data:{
        labels:q4.toArray()
          .reverse()
          .map(r=>String(r.game_date).slice(0,10)),
        datasets:[{
          label:measureLabel(),
          data:q4.toArray()
            .reverse()
            .map(r=>r.metric_value),
          borderColor:'#49d7ff',
          backgroundColor:'rgba(73,215,255,.1)',
          fill:true,
          tension:.25,
          pointRadius:1.5
        }]
      },
      options:chartOpts()
    }
  );

  $('dataTable').innerHTML=
    tableRows.toArray().map(r=>`
      <tr>
        <td>${String(r.game_date).slice(0,10)}</td>
        <td>${r.player_name}</td>
        <td>${r.team}</td>
        <td>${r.opponent}</td>
        <td>${r.location}</td>
        <td>${fmt(r.minutes)}</td>
        <td>${r.pts}</td>
        <td>${r.reb}</td>
        <td>${r.ast}</td>
        <td>${r.plus_minus>0?'+':''}${r.plus_minus}</td>
      </tr>
    `).join('');

  $('tableCount').textContent=
    `Showing ${tableRows.toArray().length} rows`;

  $('loadStatus').textContent=
    'Live • browser calculated';
}

async function init(){
  try{
    await getDuck();

    conn=await db.connect();

    await conn.query(`
      CREATE OR REPLACE VIEW logs AS
      SELECT *
      FROM read_parquet([
        ${PARQUETS.map(u=>`'${u}'`).join(',')}
      ]);
    `);

    const seasons=await conn.query(`
      SELECT DISTINCT season
      FROM logs
      ORDER BY season
    `);

    const teams=await conn.query(`
      SELECT DISTINCT team
      FROM logs
      ORDER BY team
    `);

    const opps=await conn.query(`
      SELECT DISTINCT opponent
      FROM logs
      ORDER BY opponent
    `);

    const players=await conn.query(`
      SELECT DISTINCT player_name
      FROM logs
      ORDER BY player_name
    `);

    opts(
      'seasonFilter',
      seasons.toArray().map(r=>r.season),
      'All seasons'
    );

    opts(
      'teamFilter',
      teams.toArray().map(r=>r.team),
      'All teams'
    );

    opts(
      'oppFilter',
      opps.toArray().map(r=>r.opponent),
      'All opponents'
    );

    opts(
      'playerFilter',
      players.toArray().map(r=>r.player_name),
      'All players'
    );

    document
      .querySelectorAll('select')
      .forEach(s=>s.addEventListener('change',update));

    $('resetFilters').onclick=
    $('resetTop').onclick=()=>{
      [
        'seasonFilter',
        'teamFilter',
        'oppFilter',
        'homeFilter',
        'playerFilter'
      ].forEach(id=>$(id).value='all');

      $('measureFilter').value='pts';
      $('breakdownFilter').value='season';

      update();
    };

    await update();

  }catch(e){
    console.error(e);

    $('loadStatus').textContent=
      'Data load error: '+e.message;

    $('viewSummary').textContent=
      'The dashboard could not load the NBA data.';
  }
}

init();
