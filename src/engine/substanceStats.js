import { dayEvents } from "./logicalDay.js";
import { alcoholKcalOfDay, exerciseKcalOfDay, wakeEventOfDay } from "./calculations.js";
import { DAYPARTS, daypartOf } from "./moodStats.js";
import { NICOTINE_IDS } from "../data/catalogs.js";
/* =====================================================================
   MÓDULO: engine/substanceStats.js (RC3.2 §8)
   Análisis horario completo por sustancia. Lenguaje asociativo siempre.
===================================================================== */
function evsOf(state,ids,dayIds){
  const set=new Set(dayIds), idset=new Set(ids);
  return state.events.filter(e=>e.eventType==="substance"&&idset.has(e.subtype)
    &&set.has(e.logicalDayId)).sort((a,b)=>a.createdAt<b.createdAt?-1:1);
}
export function hourHistogram(evs){
  const h=new Array(24).fill(0);
  evs.forEach(e=>{h[new Date(e.createdAt).getHours()]++;});
  return h;
}
export function daypartConcentration(evs){
  const c={}; DAYPARTS.forEach(p=>c[p.id]=0);
  evs.forEach(e=>{c[daypartOf(e.createdAt)]++;});
  let top=null,mx=0;
  DAYPARTS.forEach(p=>{ if(c[p.id]>mx){mx=c[p.id];top=p.id;} });
  return {counts:c,top:mx>0?top:null};
}
function intervalsMin(evs){
  const out=[];
  for(let i=1;i<evs.length;i++){
    const gap=(new Date(evs[i].createdAt)-new Date(evs[i-1].createdAt))/60000;
    if(gap<16*60) out.push(Math.round(gap)); // corta en cruces de sueño
  }
  return out;
}
function minutesToSleepAfterLast(state,dayId,evs){
  const dayEvs=evs.filter(e=>e.logicalDayId===dayId);
  if(!dayEvs.length) return null;
  const last=dayEvs[dayEvs.length-1];
  const day=state.logicalDays.find(d=>d.id===dayId);
  if(!day||!day.endedAt) return null;
  const m=Math.round((new Date(day.endedAt)-new Date(last.createdAt))/60000);
  return m>=0&&m<16*60?m:null;
}
export function nicotineDetail(state,dayIds){
  const all=evsOf(state,NICOTINE_IDS,dayIds);
  const cig=all.filter(e=>e.subtype==="cigarro").length;
  const iqos=all.filter(e=>e.subtype==="iqos").length;
  const hist=hourHistogram(all);
  let peakHour=null,mx=0; hist.forEach((v,h)=>{ if(v>mx){mx=v;peakHour=h;} });
  const dp=daypartConcentration(all);
  const firstGaps=[],lastGaps=[];
  dayIds.forEach(id=>{
    const wake=wakeEventOfDay(state,id);
    const dayN=all.filter(e=>e.logicalDayId===id);
    if(wake&&dayN.length){
      const g=Math.round((new Date(dayN[0].createdAt)-new Date(wake.createdAt))/60000);
      if(g>=0) firstGaps.push(g);
    }
    const ls=minutesToSleepAfterLast(state,id,all);
    if(ls!=null) lastGaps.push(ls);
  });
  const ivs=intervalsMin(all);
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
  return {total:all.length,cig,iqos,peakHour:mx>0?peakHour:null,daypart:dp,
    wakeToFirstAvg:avg(firstGaps),lastToSleepAvg:avg(lastGaps),
    intervalAvg:avg(ivs),intervalBest:ivs.length?Math.max.apply(null,ivs):null,
    intervalWorst:ivs.length?Math.min.apply(null,ivs):null,
    perDayAvg:dayIds.length?Math.round(all.length/dayIds.length*10)/10:0,n:all.length};
}
export function alcoholDetail(state,dayIds){
  const all=evsOf(state,["alcohol"],dayIds);
  const types={};
  all.forEach(e=>{const t=(e.context||{}).drink||"bebida";types[t]=(types[t]||0)+1;});
  const dp=daypartConcentration(all);
  let kcal=0; dayIds.forEach(id=>{kcal+=alcoholKcalOfDay(state,id);});
  // duración estimada del episodio: primera→última bebida del día
  const durs=[];
  dayIds.forEach(id=>{
    const d=all.filter(e=>e.logicalDayId===id);
    if(d.length>=2) durs.push(Math.round((new Date(d[d.length-1].createdAt)-new Date(d[0].createdAt))/60000));
  });
  const sleepGaps=[];
  dayIds.forEach(id=>{const g=minutesToSleepAfterLast(state,id,all); if(g!=null) sleepGaps.push(g);});
  // relación temporal (asociativa, ±3h) con ejercicio y estados difíciles
  let nearExercise=0,nearDifficult=0;
  const set=new Set(dayIds);
  const others=state.events.filter(e=>set.has(e.logicalDayId));
  all.forEach(a=>{
    const t=new Date(a.createdAt).getTime();
    if(others.some(o=>o.eventType==="exercise"&&Math.abs(new Date(o.createdAt)-t)<3*3600000)) nearExercise++;
    if(others.some(o=>o.eventType==="state"&&o.subtype==="dificil"&&Math.abs(new Date(o.createdAt)-t)<3*3600000)) nearDifficult++;
  });
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
  let exK=0; dayIds.forEach(id=>{exK+=exerciseKcalOfDay(state,id);});
  return {total:all.length,types,kcal,daypart:dp,episodeAvgMin:avg(durs),
    toSleepAvg:avg(sleepGaps),nearExercise,nearDifficult,balance:exK-kcal,n:all.length};
}
export function motaDetail(state,dayIds){
  const all=evsOf(state,["mota"],dayIds);
  const dp=daypartConcentration(all);
  const ivs=intervalsMin(all);
  const sleepGaps=[];
  dayIds.forEach(id=>{const g=minutesToSleepAfterLast(state,id,all); if(g!=null) sleepGaps.push(g);});
  const set=new Set(dayIds);
  const others=state.events.filter(e=>set.has(e.logicalDayId));
  function near(pred){
    let c=0;
    all.forEach(a=>{
      const t=new Date(a.createdAt).getTime();
      if(others.some(o=>pred(o)&&Math.abs(new Date(o.createdAt)-t)<90*60000)) c++;
    });
    return c;
  }
  const ctxIs=(o,k,vals)=>o.eventType==="state"&&((o.inferred||{})[k]&&vals.includes((o.inferred||{})[k])
    ||(o.context||{})[k]&&vals.includes((o.context||{})[k]));
  const avg=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
  return {total:all.length,daypart:dp,intervalAvg:avg(ivs),toSleepAvg:avg(sleepGaps),
    nearFantasy:near(o=>ctxIs(o,"attention",["fantasia","futuro_imaginario"])),
    nearAvoid:near(o=>ctxIs(o,"mentalIntent",["evitar","escapar"])),
    nearRumination:near(o=>ctxIs(o,"attention",["rumiacion"])),
    nearDifficult:near(o=>o.eventType==="state"&&o.subtype==="dificil"),
    nearGood:near(o=>o.eventType==="state"&&o.subtype==="bien"),n:all.length};
}

export function nicotineRecords(state){
  // recorre TODOS los días, calcula intervalos, guarda el mejor histórico y su fecha
  const all=state.events.filter(e=>e.eventType==="substance"&&NICOTINE_IDS.includes(e.subtype))
    .sort((a,b)=>a.createdAt<b.createdAt?-1:1);
  let best=null,bestAt=null;
  for(let i=1;i<all.length;i++){
    const gap=(new Date(all[i].createdAt)-new Date(all[i-1].createdAt))/60000;
    if(gap<16*60 && (best==null||gap>best)){ best=Math.round(gap); bestAt=all[i].createdAt; }
  }
  // récord actual: minutos desde el último consumo
  const last=all.length?all[all.length-1]:null;
  const current=last?Math.round((Date.now()-new Date(last.createdAt))/60000):null;
  return {bestInterval:best,bestAt,currentGap:current,total:all.length};
}
export function toleranceRecords(state){
  // impulsos tolerados (conducta cambiada) y mejor racha de esperas
  const ints=state.events.filter(e=>e.eventType==="intervention"&&e.contract&&e.contract.outcome);
  const tolerated=ints.filter(e=>e.contract.outcome.behaviorChanged).length;
  const deliberate=ints.filter(e=>e.contract&&e.contract.adultAction==="deliberar").length;
  return {tolerated,deliberate,total:ints.length};
}
