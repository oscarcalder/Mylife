import { NICOTINE_IDS } from "../data/catalogs.js";
import { STATUS_LABEL, calcConfidence, ctxIs, followedBy, statusFor } from "./director.js";
import { closedDays } from "./logicalDay.js";
import { dayStats } from "./snapshots.js";
/* =====================================================================
   MÓDULO: engine/relationsAndTrends.js  (RC3)
   Grafo de relaciones TEMPORALES (no causalidad) + tendencias y
   asociaciones con umbrales de honestidad. Lenguaje causal sólo
   lo puede ganar un experimento.
===================================================================== */
export const NODE_LABELS={sleepShort:"😴 dormir poco",lowEnergy:"🪫 energía baja",
  rumiacion:"🌀 rumiación",tension:"🫀 tensión corporal",vacio:"🕳 vacío",
  culpa:"⚖️ culpa",nicotina:"🚬 nicotina",alcohol:"🍺 alcohol",
  ejercicio:"🏃 ejercicio",dificil:"🌧 estado difícil"};
export const EDGE_LABEL={precede:"precede a",coincide:"coincide con",predice:"predice",
  posible_mediador:"posible mediador hacia",contradiccion:"en contradicción con"};
export function edgeConfLabel(n,cons){
  return STATUS_LABEL[statusFor(calcConfidence(n,60,Math.round(cons*100),Math.round((1-cons)*100)*0.4))];
}
export function seqEdge(state, from, to, trigPred, followPred, windowMin){
  const trig=state.events.filter(trigPred);
  if(trig.length<3) return null;
  let hits=0;
  trig.forEach(t=>{ if(followedBy(state,t,followPred,windowMin)) hits++; });
  const cons=hits/trig.length;
  if(hits<3||cons<0.6) return null;
  return {from,to,type:"precede",n:hits,conf:edgeConfLabel(hits,cons)};
}
export function dayPredEdge(state, days, from, to, xFn, yFn, invert){
  const A=days.filter(d=>xFn(dayStats(state,d.id)));
  const B=days.filter(d=>!xFn(dayStats(state,d.id)));
  if(A.length<3||B.length<3) return null;
  const meanB=B.reduce((s,d)=>s+yFn(dayStats(state,d.id)),0)/B.length;
  const ok=A.filter(d=>{
    const y=yFn(dayStats(state,d.id));
    return invert? y<meanB : y>meanB;
  }).length;
  const cons=ok/A.length;
  if(cons<0.65) return null;
  return {from,to,type:"predice",n:A.length,conf:edgeConfLabel(A.length,cons),
    invert:!!invert};
}
export function buildRelationGraph(state){
  const days=state.logicalDays;
  if(days.length<4) return {edges:[],cycles:[]};
  const edges=[];
  const isRum=e=>(e.eventType==="state"||e.eventType==="sos"||e.eventType==="resolver")
    &&e.inferred&&(e.inferred.attention==="rumiacion"||(e.inferred.mechanisms||[]).includes("rumiación"));
  const isSub=e=>e.eventType==="substance"&&NICOTINE_IDS.includes(e.subtype);
  const isCulpa=e=>ctxIs(e,"emotion",["culpa"]);
  [ seqEdge(state,"rumiacion","nicotina",isRum,isSub,90),
    seqEdge(state,"tension","nicotina",
      e=>e.context&&["pecho","cuello","mandibula","tension","estomago","garganta"].includes(e.context.body),isSub,60),
    seqEdge(state,"vacio","nicotina",
      e=>ctxIs(e,"emotion",["vacio"])||ctxIs(e,"underneath",["falta_estimulo"]),isSub,60),
    seqEdge(state,"nicotina","culpa",isSub,isCulpa,60),
    seqEdge(state,"culpa","rumiacion",isCulpa,isRum,90),
    dayPredEdge(state,days,"sleepShort","nicotina",s=>s.sleepShort===true,s=>s.nic),
    dayPredEdge(state,days,"lowEnergy","nicotina",s=>s.lowEnergy,s=>s.nic),
    dayPredEdge(state,days,"ejercicio","nicotina",s=>s.exercised,s=>s.nic,true),
    dayPredEdge(state,days,"dificil","alcohol",s=>s.dificil>0,s=>s.alc),
  ].forEach(e=>{ if(e) edges.push(e); });
  // posible mediador: dormir poco → (rumiación) → nicotina
  const med=dayPredEdge(state,days,"sleepShort","rumiacion",s=>s.sleepShort===true,s=>s.rumiacion);
  if(med && edges.some(e=>e.from==="rumiacion"&&e.to==="nicotina")
        && edges.some(e=>e.from==="sleepShort"&&e.to==="nicotina")){
    edges.push({from:"sleepShort",to:"nicotina",type:"posible_mediador",
      via:"rumiacion",n:med.n,conf:med.conf});
  }
  // contradicciones ganadas por experimento
  state.hypotheses.filter(h=>h.lastExperimentResult==="contradicho").forEach(h=>{
    if(h.key==="rumiacion_pre_consumo")
      edges.push({from:"rumiacion",to:"nicotina",type:"contradiccion",n:1,conf:"experimental"});
  });
  // ciclos (dirigidos, sólo precede/predice no invertidos)
  const adj={};
  edges.filter(e=>(e.type==="precede"||e.type==="predice")&&!e.invert)
    .forEach(e=>{ (adj[e.from]=adj[e.from]||[]).push(e); });
  const cycles=[]; const seen={};
  function dfs(start,node,path,confs){
    if(path.length>4) return;
    (adj[node]||[]).forEach(e=>{
      if(e.to===start&&path.length>=2){
        const sig=path.concat([start]).slice().sort().join("|");
        if(!seen[sig]){ seen[sig]=1;
          cycles.push({chain:path.concat([start]),
            conf:confs.concat([e.conf]).includes("inicial")?"inicial"
              :confs.concat([e.conf]).includes("emergente")?"emergente":"probable"}); }
      } else if(!path.includes(e.to)){
        dfs(start,e.to,path.concat([e.to]),confs.concat([e.conf]));
      }
    });
  }
  Object.keys(adj).forEach(n=>dfs(n,n,[n],[]));
  return {edges,cycles};
}
/* ---------- tendencias y asociaciones con umbrales ---------- */
export const TREND_MSG="Tendencia preliminar; todavía estoy acumulando evidencia.";
export const ASSOC_MSG="Veo una señal posible, pero todavía no hay evidencia suficiente para cuantificarla.";
export function metricSeries(state, key){
  return closedDays(state).map(d=>{
    const s=dayStats(state,d.id);
    const v = key==="nicotina"?s.nic : key==="alcohol"?s.alcKcal
      : key==="sueno"?s.sleepMin : key==="ejercicio"?s.exKcal : null;
    return {day:d, v};
  });
}
export function trendOfMetric(state, key){
  const cds=closedDays(state);
  const series=metricSeries(state,key).filter(x=>x.v!=null&&!(key==="ejercicio"&&x.v===0&&false));
  const valid=series.filter(x=>x.v!=null);
  if(cds.length<14||valid.length<8||valid.length<12)
    return {ok:false,msg:TREND_MSG,days:cds.length,valid:valid.length};
  const half=Math.floor(valid.length/2);
  const m1=valid.slice(0,half).reduce((s,x)=>s+x.v,0)/half;
  const m2=valid.slice(half).reduce((s,x)=>s+x.v,0)/(valid.length-half);
  if(m1===0&&m2===0) return {ok:true,dir:"→",delta:0,n:valid.length};
  const base=Math.max(1e-9,Math.abs(m1));
  const delta=Math.round((m2-m1)/base*100);
  return {ok:true,dir:delta>=10?"↗":delta<=-10?"↘":"→",delta,n:valid.length};
}
export function pearson(pairs){
  const n=pairs.length;
  const mx=pairs.reduce((s,p)=>s+p[0],0)/n, my=pairs.reduce((s,p)=>s+p[1],0)/n;
  let sxy=0,sx=0,sy=0;
  pairs.forEach(([x,y])=>{ sxy+=(x-mx)*(y-my); sx+=(x-mx)*(x-mx); sy+=(y-my)*(y-my); });
  if(sx===0||sy===0) return null;
  return sxy/Math.sqrt(sx*sy);
}
export function assocOfMetrics(state, xKey, yKey, xLabel, yLabel, lessIsX){
  const cds=closedDays(state);
  const pairs=closedDays(state).map(d=>{
    const s=dayStats(state,d.id);
    const x=xKey==="sueno"?s.sleepMin:xKey==="ejercicio"?s.exKcal:null;
    const y=yKey==="nicotina"?s.nic:null;
    return x!=null&&y!=null?[x,y]:null;
  }).filter(Boolean);
  if(cds.length<30||pairs.length<20||pairs.length<30)
    return {ok:false,msg:ASSOC_MSG,days:cds.length,pairs:pairs.length};
  const r=pearson(pairs);
  if(r==null) return {ok:false,msg:ASSOC_MSG,days:cds.length,pairs:pairs.length};
  const fuerza=Math.abs(r)<0.3?"débil":Math.abs(r)<0.6?"moderada":"fuerte";
  const pct=Math.round(r*r*100);
  const dir=r<0?(lessIsX||"Menos "+xLabel+" se asocia con más "+yLabel)
    :"Más "+xLabel+" se asocia con más "+yLabel;
  return {ok:true,phrase:dir+" en tus datos (asociación "+fuerza+", ~"+pct+"% de la variación). Asociación, no causalidad.",
    r:Math.round(r*100)/100,n:pairs.length};
}

