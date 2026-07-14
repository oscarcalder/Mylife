/* =====================================================================
   MÓDULO: utils/time.js
===================================================================== */
export function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8); }
export function nowISO(){ return new Date().toISOString(); }
export function pad2(n){ return String(n).padStart(2,"0"); }
export function fmtClock(iso){ const d=new Date(iso); return pad2(d.getHours())+":"+pad2(d.getMinutes()); }
export function fmtDate(iso){
  const d=new Date(iso);
  return d.toLocaleDateString("es-MX",{weekday:"short",day:"numeric",month:"short"});
}
export function dateKey(iso){ const d=new Date(iso); return d.getFullYear()+"-"+pad2(d.getMonth()+1)+"-"+pad2(d.getDate()); }
export function minsBetween(a,b){ return Math.round((new Date(b)-new Date(a))/60000); }
export function fmtDur(min){
  if(min==null||isNaN(min)) return "—";
  if(min<60) return min+" min";
  const h=Math.floor(min/60), m=min%60;
  return m? h+"h "+m+"m" : h+"h";
}
export function timeAgo(iso){
  if(!iso) return "—";
  const m=minsBetween(iso,nowISO());
  if(m<1) return "ahora";
  return "hace "+fmtDur(m);
}
export function hourOf(iso){ return new Date(iso).getHours(); }

