import { nowISO, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/logicalDay.js
===================================================================== */
export function getOpenDay(state){
  let d = state.logicalDays.find(x=>x.status==="open");
  if(!d){
    d = { id: uid(), startedAt: nowISO(), status:"open" };
    state.logicalDays.push(d);
  }
  return d;
}
export function closedDays(state){ return state.logicalDays.filter(d=>d.status==="closed"); }
export function logicalDayNumber(state){ return closedDays(state).length + 1; }
export function dayEvents(state, dayId){ return state.events.filter(e=>e.logicalDayId===dayId); }
export function eventsToday(state){ const d=getOpenDay(state); return dayEvents(state, d.id); }

export function openDayRO(s){ return s.logicalDays.find(d=>d.status==="open")||null; }
