const $=id=>document.getElementById(id);
let DATA=[];
const n=v=>{const x=Number(v);return Number.isFinite(x)?x:0};
const fmt=(v,d=1)=>Number(v||0).toLocaleString(undefined,{minimumFractionDigits:d,maximumFractionDigits:d});
function group(key,measure){
 const m=new Map();
 DATA.forEach(r=>{const k=r[key];if(!k)return;if(!m.has(k))m.set(k,{label:k,rows:0,sum:0});const g=m.get(k);g.rows++;g.sum+=n(r[measure]);});
 return [...m.values()].map(g=>({...g,value:g.sum/g.rows}));
}
function bars(id,rows){
 const el=$(id),max=Math.max(...rows.map(r=>r.value),1);
 el.innerHTML='<div class="bars">'+rows.map(r=>{const h=Math.max(2,r.value/max*220);return '<div class="barcol"><div class="bar" style="height:'+h+'px"><span>'+fmt(r.value)+'</span></div><div class="barlabel" title="'+r.label+'">'+r.label+'</div></div>'}).join('')+'</div>';
}
function top(key,measure,count=5,minRows=0){return group(key,measure).filter(x=>x.rows>=minRows).sort((a,b)=>b.value-a.value).slice(0,count)}
function season(measure){return group('season',measure).sort((a,b)=>a.label.localeCompare(b.label))}
function sentenceList(rows){return rows.map(x=>x.label+' ('+fmt(x.value)+')').join(', ')}
function render(){
 $('rRows').textContent=DATA.length.toLocaleString();

 const a=top('team','pts'); $('f1Title').textContent=a[0].label+' led teams in average player scoring.'; $('f1Text').textContent='The five highest team averages in points per player-game were '+sentenceList(a)+'. These are player-game averages, not team points per game.'; bars('f1Chart',a);

 const b=season('minutes'); const bHi=[...b].sort((x,y)=>y.value-x.value)[0]; $('f2Title').textContent=bHi.label+' had the highest average minutes per player-game.'; $('f2Text').textContent='Average minutes by season were '+sentenceList(b)+'. Showing playing time alongside production helps put scoring, rebounding, and assists in context.'; bars('f2Chart',b);

 const hm=new Map(); DATA.forEach(r=>{const k=String(r.home).toLowerCase()==='true'?'Home':'Road';if(!hm.has(k))hm.set(k,{label:k,rows:0,sum:0});const g=hm.get(k);g.rows++;g.sum+=n(r.pts)}); const c=[...hm.values()].map(g=>({...g,value:g.sum/g.rows})); const ch=[...c].sort((x,y)=>y.value-x.value); $('f3Title').textContent=ch[0].label+' player-games had slightly higher average scoring.'; $('f3Text').textContent='Players averaged '+fmt(c.find(x=>x.label==='Home').value)+' points at home and '+fmt(c.find(x=>x.label==='Road').value)+' points on the road across the five-season sample.'; bars('f3Chart',c);

 const d=top('team','reb'); $('f4Title').textContent=d[0].label+' led teams in average rebounds per player-game.'; $('f4Text').textContent='The five highest team rebounding averages were '+sentenceList(d)+'. This comparison shows production beyond scoring.'; bars('f4Chart',d);

 const e=top('team','ast'); $('f5Title').textContent=e[0].label+' led teams in average assists per player-game.'; $('f5Text').textContent='The five highest team assist averages were '+sentenceList(e)+'. Assists provide a simple view of playmaking across team contexts.'; bars('f5Chart',e);

 const f=season('fg3a'); const fHi=[...f].sort((x,y)=>y.value-x.value)[0]; $('f6Title').textContent=fHi.label+' had the highest three-point-attempt average.'; $('f6Text').textContent='Average three-point attempts per player-game by season were '+sentenceList(f)+'. This shows how perimeter shot volume changed across the five seasons.'; bars('f6Chart',f);

 const g=season('fga'); const gHi=[...g].sort((x,y)=>y.value-x.value)[0]; $('f7Title').textContent=gHi.label+' had the highest field-goal-attempt average.'; $('f7Text').textContent='Average field-goal attempts per player-game by season were '+sentenceList(g)+'. Shot attempts provide useful context for the scoring results.'; bars('f7Chart',g);

 const h=top('player_name','pts',5,200); $('f8Title').textContent=h[0].label+' had the highest scoring average among players with 200+ appearances.'; $('f8Text').textContent='Among players with at least 200 player-game rows, the five highest scoring averages were '+sentenceList(h)+'. The 200-game minimum keeps this comparison focused on players with substantial five-season samples.'; bars('f8Chart',h);

 $('reportStatus').textContent='Report calculations complete • '+DATA.length.toLocaleString()+' player-game rows analyzed';
}
Papa.parse('data/player_games.csv',{download:true,header:true,skipEmptyLines:true,complete:r=>{DATA=r.data;render()},error:e=>{$('reportStatus').textContent='Report data error: '+e.message;console.error(e)}});