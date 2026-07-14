import { NICOTINE_IDS } from "../data/catalogs.js";
import { avgIntervalBetween, exerciseKcalOfDay, firstNicotineMinAfterWake, substanceEvents, timeSinceLastSubstance } from "./calculations.js";
import { closedDays, eventsToday, getOpenDay } from "./logicalDay.js";
import { dateKey, fmtDur, nowISO } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/insightsEngine.js  (v3 RC3)
   Prioridad clínica = impacto × frecuencia × persistencia × confianza,
   modulada por accionabilidad y novedad. Bajo el umbral: silencio.
===================================================================== */
export function buildVictories(state){
  const out=[];
  const d=getOpenDay(state);
  const gap=timeSinceLastSubstance(state,NICOTINE_IDS);
  const avg=avgIntervalBetween(state,NICOTINE_IDS,7);
  if(gap!=null && avg!=null && gap>avg*1.3 && gap>45){
    out.push({ type:"victory", score:70,
      text:"Llevas "+fmtDur(gap)+" sin nicotina. Tu promedio es "+fmtDur(avg)+". Ese espacio es tuyo." });
  }
  const exKcal=exerciseKcalOfDay(state,d.id);
  if(exKcal>0) out.push({ type:"victory", score:55,
    text:"Hoy ya moviste el cuerpo: "+exKcal+" kcal a tu favor." });
  const cds=closedDays(state);
  let streak=0;
  for(let i=cds.length-1;i>=0;i--){
    if(substanceEvents(state,["alcohol"],cds[i].id).length===0) streak++; else break;
  }
  if(streak>=2) out.push({ type:"victory", score:60,
    text:streak+" días lógicos seguidos sin alcohol." });
  // primer consumo más tarde que tu promedio
  const firstToday=firstNicotineMinAfterWake(state,d.id);
  if(firstToday!=null){
    const hist=[];
    cds.slice(-7).forEach(cd=>{
      const m=firstNicotineMinAfterWake(state,cd.id);
      if(m!=null) hist.push(m);
    });
    if(hist.length>=3){
      const havg=hist.reduce((a,b)=>a+b,0)/hist.length;
      if(firstToday>havg*1.2) out.push({ type:"victory", score:66,
        text:"El primer consumo llegó "+fmtDur(Math.round(firstToday-havg))+" más tarde que tu promedio." });
    }
  }
  // espera elegida ante el impulso
  const waitedToday=eventsToday(state).some(e=>e.context&&e.context.couldWait==="si");
  if(waitedToday) out.push({ type:"victory", score:58,
    text:"Hoy hubo al menos una espera elegida ante el impulso. Eso es el músculo creciendo." });
  // entrenamiento que ayudó
  const tr=eventsToday(state).find(e=>e.eventType==="training"&&e.context&&e.context.helped==="si");
  if(tr) out.push({ type:"victory", score:57,
    text:"Entrenaste "+tr.subtype+" y ayudó: la intensidad bajó de "
      +tr.context.intensityBefore+" a "+tr.context.intensityAfter+"." });
  // día sin estado difícil (con registros y ya avanzada la tarde)
  const states=eventsToday(state).filter(e=>e.eventType==="state");
  if(states.length>=2 && !states.some(e=>e.subtype==="dificil") && new Date().getHours()>=18){
    out.push({ type:"victory", score:52, text:"Un día con registros y sin estado difícil hasta ahora." });
  }
  return out.sort((a,b)=>b.score-a.score);
}
export function markInsightShown(state, hypKey){
  if(!state.insightHistory) state.insightHistory={};
  const today=dateKey(nowISO());
  const h=state.insightHistory[hypKey]||{streakDays:0,lastDay:null};
  if(h.lastDay!==today){
    const yesterday=dateKey(new Date(Date.now()-86400000).toISOString());
    h.streakDays = h.lastDay===yesterday ? h.streakDays+1 : 1;
    h.lastDay=today;
  }
  state.insightHistory[hypKey]=h;
}
export const IMPACT_BY_MECH={
  "regulación con sustancia":0.95,"compulsión / obediencia":0.95,"consumo automático":0.9,
  "rumiación":0.85,"evitación":0.8,"intolerancia a vacío":0.8,
  "búsqueda de certeza":0.75,"anticipación":0.75,"activación corporal":0.72,
  "catastrofización":0.7,"juez interno":0.7,"autoexigencia":0.7,
  "necesidad de control":0.65,"simulación de futuros":0.6,
};
export const SILENCE_THRESHOLD=0.10;
export function priorityOf(state,h){
  const imp=IMPACT_BY_MECH[h.mechanism]||0.6;
  const evCount=Math.max(1,Math.round((h.evidenceEventIds||[]).length/2));
  const freq=Math.min(1,Math.max(0.4,evCount/8)); // piso 0.4: la evidencia ya vive en la confianza
  const persDays=(new Date(h.updatedAt)-new Date(h.createdAt))/86400000;
  const pers=Math.min(1,Math.max(0.5,persDays/14)); // piso 0.5: juventud no es irrelevancia
  let p=imp*freq*pers*(h.confidence/100);
  const active=state.experiments.some(x=>x.hypKey===h.key&&x.status==="activo");
  if(h.suggestedExperiment||active) p*=1.2;          // accionabilidad
  const hist=(state.insightHistory||{})[h.key];
  if(hist&&hist.streakDays>=3&&hist.lastDay!==dateKey(h.updatedAt)) p*=0.7; // novedad
  if(h.lastExperimentResult==="contradicho") p*=0.8;
  return p;
}
export function buildInsights(state){
  const scored=state.hypotheses.map(h=>({type:"hypothesis",h,
    score:priorityOf(state,h)})).sort((a,b)=>b.score-a.score);
  let primary=scored[0]&&scored[0].score>=SILENCE_THRESHOLD?scored[0]:null;
  let secondary=primary?scored.find(s=>s!==primary
    &&s.score>=SILENCE_THRESHOLD&&s.h.mechanism!==primary.h.mechanism)||null:null;
  const victories=buildVictories(state);
  return { primary, secondary, victory:victories[0]||null,
    silenced:!primary&&state.hypotheses.length>0 };
}

