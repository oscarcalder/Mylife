import { NICOTINE_IDS } from "../data/catalogs.js";
import { alcoholKcalOfDay, dominantEmotion, exerciseKcalOfDay, firstNicotineMinAfterWake, substanceEvents, wakeEventOfDay, workLeisureTotals } from "./calculations.js";
import { coachHomeLine } from "./coach.js";
import { APP_VERSION } from "./config.js";
import { latentSnapshot } from "./latentVars.js";
import { dayEvents, logicalDayNumber } from "./logicalDay.js";
import { nowISO, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/snapshots.js  (RC3)
   Snapshot inmutable al cerrar cada día lógico: lo que el sistema
   sabía EN ESE MOMENTO. Nunca sustituye a events; acelera y permite
   la Máquina del Tiempo. derived es caché: si no coincide, ganan events.
===================================================================== */
export function computeDayStats(state, dayId){
  const evs=dayEvents(state,dayId);
  const st={ nic:substanceEvents(state,NICOTINE_IDS,dayId).length,
    cig:substanceEvents(state,["cigarro"],dayId).length,
    iqos:substanceEvents(state,["iqos"],dayId).length,
    alc:substanceEvents(state,["alcohol"],dayId).length,
    alcKcal:alcoholKcalOfDay(state,dayId),
    mota:substanceEvents(state,["mota"],dayId).length,
    cafe:substanceEvents(state,["cafe"],dayId).length,
    exKcal:exerciseKcalOfDay(state,dayId),
    exercised:evs.some(e=>e.eventType==="exercise"),
    micro:evs.filter(e=>e.eventType==="microAction").length,
    states:evs.filter(e=>e.eventType==="state").length,
    dificil:evs.filter(e=>e.eventType==="state"&&e.subtype==="dificil").length,
    rumiacion:evs.filter(e=>e.inferred&&(e.inferred.attention==="rumiacion"
      ||(e.inferred.mechanisms||[]).includes("rumiación"))).length,
    tension:evs.filter(e=>e.context&&["pecho","cuello","mandibula","tension","estomago","garganta"].includes(e.context.body)).length,
    vacio:evs.filter(e=>e.context&&e.context.emotion==="vacio").length,
    culpa:evs.filter(e=>e.context&&e.context.emotion==="culpa").length,
    firstNicMin:firstNicotineMinAfterWake(state,dayId),
    waits:evs.filter(e=>e.context&&e.context.couldWait==="si").length,
    events:evs.length };
  const wake=wakeEventOfDay(state,dayId);
  st.wakeEnergy=wake&&wake.context?wake.context.wakeEnergy||null:null;
  st.lowEnergy=st.wakeEnergy==="baja"||st.wakeEnergy==="agotado";
  const wl=workLeisureTotals(state,dayId);
  st.workMin=wl.totals.work; st.leisureMin=wl.totals.leisure;
  const dom=dominantEmotion(state,dayId);
  st.emotion=dom?(dom.emotion||dom.branch):null;
  const sess=state.sleepSessions.find(s=>s.type==="mainSleep"&&s.durationMin
    && state.events.some(e=>e.logicalDayId===dayId&&e.eventType==="wake"
      &&e.subtype==="mainSleep"&&Math.abs(new Date(e.createdAt)-new Date(s.endedAt||0))<60000));
  st.sleepMin=sess?sess.durationMin:null;
  st.sleepShort=st.sleepMin!=null?st.sleepMin<360:null;
  return st;
}
export function ensureDerived(state){
  if(!state.derived||typeof state.derived!=="object") state.derived={days:{},eventCount:-1};
  if(!state.derived.days) state.derived.days={};
  return state.derived;
}
export function rebuildDerived(state){
  const d=ensureDerived(state);
  d.days={};
  state.logicalDays.forEach(day=>{ d.days[day.id]=computeDayStats(state,day.id); });
  d.eventCount=state.events.length;
  d.rebuiltAt=nowISO();
}
export function verifyDerived(state){
  const d=ensureDerived(state);
  if(d.eventCount!==state.events.length) rebuildDerived(state); // ganan los eventos
}
export function dayStats(state, dayId){
  verifyDerived(state);
  const d=ensureDerived(state);
  if(!d.days[dayId]) d.days[dayId]=computeDayStats(state,dayId);
  return d.days[dayId];
}
export function derivedOnEvent(state, ev){
  const d=ensureDerived(state);
  d.days[ev.logicalDayId]=computeDayStats(state,ev.logicalDayId);
  d.eventCount=state.events.length;
}
export function buildSnapshot(state, day){
  return { id:uid(), dayId:day.id, dayNumber:logicalDayNumber(state),
    closedAt:nowISO(), algoVersion:APP_VERSION, regenerated:false,
    stats:computeDayStats(state,day.id),
    latents:latentSnapshot(state).map(l=>({key:l.key,label:l.label,value:l.value})),
    hypotheses:state.hypotheses.map(h=>({key:h.key,title:h.title,mechanism:h.mechanism,
      confidence:h.confidence,status:h.status})),
    coachLine:coachHomeLine(state).text,
    experimentsActive:state.experiments.filter(x=>x.status==="activo").map(x=>x.text) };
}
export function snapshotOfDay(state, dayId){
  return (state.snapshots||[]).find(s=>s.dayId===dayId)||null;
}
export function regenerateSnapshotStats(state, snap){
  // sólo la parte derivable de eventos; el estado mental de aquel momento no se inventa
  snap.stats=computeDayStats(state,snap.dayId);
  snap.regenerated=true; snap.regeneratedAt=nowISO();
  return snap;
}

