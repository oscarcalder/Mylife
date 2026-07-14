import { NICOTINE_IDS } from "../data/catalogs.js";
import { OPTION_LABELS } from "../data/questionBank.js";
import { closedDays, getOpenDay } from "./logicalDay.js";
import { minsBetween, nowISO } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/calculations.js  (selectores derivados de events)
===================================================================== */
export function substanceEvents(state, ids, dayId){
  return state.events.filter(e=>e.eventType==="substance"
    && ids.includes(e.subtype)
    && (!dayId || e.logicalDayId===dayId));
}
export function substanceCountToday(state, id){
  const d=getOpenDay(state);
  return substanceEvents(state,[id],d.id).length;
}
export function lastSubstanceUse(state, ids){
  const evs = substanceEvents(state, ids);
  return evs.length ? evs[evs.length-1] : null;
}
export function timeSinceLastSubstance(state, ids){
  const last = lastSubstanceUse(state, ids);
  return last ? minsBetween(last.createdAt, nowISO()) : null;
}
export function lastEventOf(state, type){
  for(let i=state.events.length-1;i>=0;i--){
    if(state.events[i].eventType===type) return state.events[i];
  }
  return null;
}
export function avgIntervalBetween(state, ids, sinceDays){
  const cutoff = Date.now() - (sinceDays||7)*86400000;
  const evs = substanceEvents(state, ids).filter(e=>new Date(e.createdAt).getTime()>cutoff);
  if(evs.length<2) return null;
  let total=0;
  for(let i=1;i<evs.length;i++) total += minsBetween(evs[i-1].createdAt, evs[i].createdAt);
  return Math.round(total/(evs.length-1));
}
export function wakeEventOfDay(state, dayId){
  return state.events.find(e=>e.logicalDayId===dayId && e.eventType==="wake" && e.subtype==="mainSleep");
}
export function firstNicotineMinAfterWake(state, dayId){
  const wake = wakeEventOfDay(state, dayId);
  if(!wake) return null;
  const first = state.events.find(e=>e.logicalDayId===dayId
    && e.eventType==="substance" && NICOTINE_IDS.includes(e.subtype)
    && e.createdAt > wake.createdAt);
  return first ? minsBetween(wake.createdAt, first.createdAt) : null;
}
export function alcoholKcalOfDay(state, dayId){
  return substanceEvents(state,["alcohol"],dayId)
    .reduce((s,e)=> s + (e.value && e.value.kcal ? e.value.kcal : 120), 0);
}
export function exerciseKcalOfDay(state, dayId){
  return state.events.filter(e=>e.logicalDayId===dayId
    && (e.eventType==="exercise"||e.eventType==="microAction"))
    .reduce((s,e)=> s + (e.value && e.value.kcal ? e.value.kcal : 0), 0);
}
export function workLeisureTotals(state, dayId){
  const evs = state.events.filter(e=>e.logicalDayId===dayId
    && (e.eventType==="work"||e.eventType==="leisure"))
    .sort((a,b)=>a.createdAt<b.createdAt?-1:1);
  const totals={work:0,leisure:0}; let active=null, since=null;
  evs.forEach(e=>{
    if(e.value==="start"){
      if(active) totals[active]+=minsBetween(since,e.createdAt);
      active=e.eventType; since=e.createdAt;
    } else if(e.value==="stop" && active===e.eventType){
      totals[active]+=minsBetween(since,e.createdAt);
      active=null; since=null;
    }
  });
  if(active) totals[active]+=minsBetween(since,nowISO());
  return { totals, active, since };
}
export function dominantEmotion(state, dayId){
  const evs = state.events.filter(e=>e.logicalDayId===dayId && e.eventType==="state");
  if(!evs.length) return null;
  const count={};
  evs.forEach(e=>{ const k=e.subtype||"?"; count[k]=(count[k]||0)+1; });
  let best=null,bn=0;
  Object.entries(count).forEach(([k,n])=>{ if(n>bn){best=k;bn=n;} });
  const last = evs[evs.length-1];
  const emo = (last.context && last.context.emotion) ? OPTION_LABELS[last.context.emotion] : null;
  return { branch:best, emotion:emo, count:evs.length };
}
export function daySemaphore(state){
  const d=getOpenDay(state);
  const nicToday = substanceEvents(state, NICOTINE_IDS, d.id).length;
  const closed = closedDays(state).slice(-7);
  if(!closed.length) return "⚪";
  const avg = closed.reduce((s,cd)=> s + substanceEvents(state,NICOTINE_IDS,cd.id).length, 0)/closed.length;
  if(avg===0) return nicToday===0 ? "🟢" : "🟡";
  if(nicToday <= avg) return "🟢";
  if(nicToday <= avg*1.5) return "🟡";
  return "🔴";
}

