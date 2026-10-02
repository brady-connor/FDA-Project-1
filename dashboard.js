const $ = id => document.getElementById(id);
let DATA = [];

function n(v){ const x=Number(v); return Number.isFinite(x)?x:0; }
function fmt(v,d=1){ return Number(v||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d}); }
function uniq(key){ return [...new Set(DATA.map(r=>r[key]).filter(Boolean))].sort(); }
function monthOf(r){ return String(r.game_date||'').slice(0,7); }
function homeOf(r){ return String(r.home).toLowerCase()==='true' || r.home===true ? 'Home' : 'Road'; }

function setOptions(id, values, first){
  const el=$(id);
  if(!el) return;
  el.innerHTML='<option value="ALL">'+first+'</option>'+values.map(v=>'<option value="'+v+'">'+v+'</option>').join('');
}

function filtered(){
  return DATA.filter(r =>
    ($('season').value==='ALL' || r.season===$('season').value) &&
    ($('month').value==='ALL' || monthOf(r)===$('month').value) &&
    ($('team').value==='ALL' || r.team===$('team').value) &&
    ($('opponent').value==='ALL' || r.opponent===$('opponent').value) &&
    ($('home').value==='ALL' || String(r.home).toLowerCase()===$('home').value)
  );
}

function avg(rows,key){
  if(!rows.length) return 0;
  return rows.reduce((s,r)=>s+n(r[key]),0)/rows.length;
}

function labelFor(r,key){
  if(key==='month') return monthOf(r);
  if(key==='home') return homeOf(r);
  return r[key] || 'Unknown';
}

function grouped(rows,key,measure,limit=30){
  const m=new Map();
  rows.forEach(r=>{
    const label=labelFor(r,key);
    if(!m.has(label)) m.set(label,{label,rows:0,sum:0});
    const g=m.get(label);
    g.rows++;
    if(measure!=='count') g.sum+=n(r[measure]);
  });
  return [...m.values()]
    .map(g=>({label:g.label,value:measure==='count'?g.rows:(g.rows?g.sum/g.rows:0),rows:g.rows}))
    .sort((a,b)=>b.value-a.value)
    .slice(0,limit);
}

function renderBars(id,rows){
  const el=$(id);
  if(!rows.length){ el.innerHTML='<p class="muted">No rows match these filters.</p>'; return; }
  const max=Math.max(...rows.map(r=>r.value),1);
  el.innerHTML='<div class="bars">'+rows.map(r=>{
    const h=Math.max(2,(r.value/max)*220);
    return '<div class="barcol"><div class="bar" style="height:'+h+'px"><span>'+fmt(r.value)+'</span></div><div class="barlabel" title="'+r.label+'">'+r.label+'</div></div>';
  }).join('')+'</div>';
}

function update(){
  const rows=filtered();
  const measure=$('measure').value;
  const breakdown=$('breakdown').value;

  $('kRows').textContent=rows.length.toLocaleString();
  $('kPts').textContent=fmt(avg(rows,'pts'));
  $('kReb').textContent=fmt(avg(rows,'reb'));
  $('kAst').textContent=fmt(avg(rows,'ast'));

  $('t1').textContent=$('measure').selectedOptions[0].text+' by '+$('breakdown').selectedOptions[0].text;
  renderBars('chart1',grouped(rows,breakdown,measure,20));
  renderBars('chart2',grouped(rows,'month',measure,60));
  renderBars('chart3',grouped(rows,'team',measure,30));
  renderBars('chart4',grouped(rows,'home',measure,2));

  const tableGroups=grouped(rows,breakdown,'count',50);
  const byLabel=new Map();
  rows.forEach(r=>{
    const label=labelFor(r,breakdown);
    if(!byLabel.has(label)) byLabel.set(label,[]);
    byLabel.get(label).push(r);
  });
  $('tbody').innerHTML=tableGroups.map(g=>{
    const rr=byLabel.get(g.label)||[];
    return '<tr><td>'+g.label+'</td><td>'+rr.length.toLocaleString()+'</td><td>'+fmt(avg(rr,'pts'))+'</td><td>'+fmt(avg(rr,'reb'))+'</td><td>'+fmt(avg(rr,'ast'))+'</td><td>'+fmt(avg(rr,'minutes'))+'</td></tr>';
  }).join('');

  $('status').textContent='Live • '+DATA.length.toLocaleString()+' player-game rows available';
}

function init(){
  $('status').textContent='Loading NBA data…';
  Papa.parse('data/player_games.csv',{
    download:true,
    header:true,
    skipEmptyLines:true,
    complete: result=>{
      DATA=result.data;
      setOptions('season',uniq('season'),'All seasons');
      setOptions('month',[...new Set(DATA.map(monthOf).filter(Boolean))].sort(),'All months');
      setOptions('team',uniq('team'),'All teams');
      setOptions('opponent',uniq('opponent'),'All opponents');

      document.querySelectorAll('.controls select').forEach(el=>el.addEventListener('change',update));
      $('reset').addEventListener('click',()=>{
        ['season','month','team','opponent','home'].forEach(id=>$(id).value='ALL');
        $('measure').value='pts';
        $('breakdown').value='team';
        update();
      });
      update();
    },
    error: err=>{
      console.error(err);
      $('status').textContent='Data load error: '+err.message;
    }
  });
}

init();