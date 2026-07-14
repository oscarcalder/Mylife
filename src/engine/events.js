import { inferFromAnswers } from "../data/questionBank.js";
import { SCHEMA_VERSION } from "./config.js";
import { directorOnEvent, recalcAllHypotheses } from "./director.js";
import { updateLatentOnEvent } from "./latentVars.js";
import { getOpenDay } from "./logicalDay.js";
import { derivedOnEvent, rebuildDerived, regenerateSnapshotStats } from "./snapshots.js";
import { nowISO, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/events.js
   Actualización incremental: cada evento nuevo dispara SOLO los
   cálculos e hipótesis afectadas (directorOnEvent), nunca un
   recálculo total del historial.
===================================================================== */
export function addEvent(state, partial){
  const day = getOpenDay(state);
  const ev = Object.assign({
    id: uid(),
    schemaVersion: SCHEMA_VERSION,
    createdAt: nowISO(),
    logicalDayId: day.id,
    source: "quick",
  }, partial);
  state.events.push(ev);
  updateLatentOnEvent(state, ev);
  derivedOnEvent(state, ev);
  directorOnEvent(state, ev);
  return ev;
}
export function patchEventContext(state, eventId, answers){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return;
  ev.context = Object.assign({}, ev.context, answers);
  const inf = inferFromAnswers(ev.context);
  if(Object.keys(inf).length) ev.inferred = Object.assign({}, ev.inferred, inf);
  updateLatentOnEvent(state, ev);
  directorOnEvent(state, ev);
}
export function deleteEvent(state, eventId){
  state.events = state.events.filter(e=>e.id!==eventId);
  rebuildDerived(state);
  recalcAllHypotheses(state);
}


export function editEvent(state, eventId, patch){
  const ev = state.events.find(e=>e.id===eventId);
  if(!ev) return null;
  if(!ev.originalEvent){
    const clone=JSON.parse(JSON.stringify(ev));
    delete clone.originalEvent;
    ev.originalEvent=clone;
  }
  if(patch.subtype!==undefined) ev.subtype=patch.subtype;
  if(patch.context) ev.context=Object.assign({},ev.context,patch.context);
  if(patch.createdAt) ev.createdAt=patch.createdAt;
  ev.editedAt=nowISO();
  ev.editCount=(ev.editCount||0)+1;
  const inf=inferFromAnswers(ev.context||{});
  if(Object.keys(inf).length) ev.inferred=Object.assign({},ev.inferred,inf);
  rebuildDerived(state);
  recalcAllHypotheses(state);
  const snap=(state.snapshots||[]).find(sn=>sn.dayId===ev.logicalDayId);
  if(snap) regenerateSnapshotStats(state,snap);
  return ev;
}
export function editedEventsCount(state){
  return state.events.filter(e=>e.editedAt).length;
}
