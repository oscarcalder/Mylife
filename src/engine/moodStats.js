import { dayEvents } from "./logicalDay.js";
/* =====================================================================
   MÓDULO: engine/moodStats.js (RC3.2 §7)
   Estado de ánimo histórico completo: Balance / Emociones / Horario.
   Solo eventos state reales; nunca inventa dominantes sin datos.
===================================================================== */
export const DAYPARTS=[
  {id:"madrugada",label:"🌌 Madrugada",from:0,to:6},
  {id:"manana",label:"🌅 Mañana",from:6,to:12},
  {id:"tarde",label:"☀️ Tarde",from:12,to:18},
  {id:"noche",label:"🌙 Noche",from:18,to:24}];
export function daypartOf(iso){
  const h=new Date(iso).getHours();
  return DAYPARTS.find(p=>h>=p.from&&h<p.to).id;
}
export const EMOTION_LABEL={paz:"Paz",bienestar:"Bienestar",satisfaccion:"Satisfacción",
  motivacion:"Motivación",conexion:"Conexión",estres:"Estrés",miedo:"Miedo",
  angustia:"Angustia",tristeza:"Tristeza",enojo:"Enojo",vacio:"Vacío",
  impotencia:"Impotencia",incertidumbre:"Incertidumbre",soledad:"Soledad",
  insuficiencia:"Insuficiencia",culpa:"Culpa",celos:"Celos",verguenza:"Vergüenza"};
export function stateEventsOf(state,dayIds){
  const set=new Set(dayIds);
  return state.events.filter(e=>e.eventType==="state"&&set.has(e.logicalDayId));
}
export function moodBalance(state,dayIds){
  const days=dayIds.map(id=>{
    const evs=dayEvents(state,id).filter(e=>e.eventType==="state");
    const bien=evs.filter(e=>e.subtype==="bien").length;
    const neutral=evs.filter(e=>e.subtype==="neutral").length;
    const dificil=evs.filter(e=>e.subtype==="dificil").length;
    const counts={};
    evs.forEach(e=>{const em=(e.context||{}).emotion; if(em) counts[em]=(counts[em]||0)+1;});
    let dominante=null,mx=0;
    Object.keys(counts).forEach(k=>{ if(counts[k]>mx){mx=counts[k];dominante=k;} });
    return {dayId:id,bien,neutral,dificil,dominante};
  });
  const tot={bien:0,neutral:0,dificil:0};
  const emo={};
  days.forEach(d=>{tot.bien+=d.bien;tot.neutral+=d.neutral;tot.dificil+=d.dificil;});
  stateEventsOf(state,dayIds).forEach(e=>{
    const em=(e.context||{}).emotion; if(em) emo[em]=(emo[em]||0)+1;});
  let dominante=null,mx=0;
  Object.keys(emo).forEach(k=>{ if(emo[k]>mx){mx=emo[k];dominante=k;} });
  const n=tot.bien+tot.neutral+tot.dificil;
  return {days,totals:tot,dominante,n};
}
export function moodComparison(state,dayIds,prevDayIds){
  const MIN=6;
  const a=moodBalance(state,dayIds), b=moodBalance(state,prevDayIds);
  if(a.n<MIN||b.n<MIN)
    return {ok:false,msg:"Aún no hay suficientes registros para comparar periodos."};
  const pct=x=>x.n?Math.round(x.totals.bien/x.n*100):0;
  const d=pct(a)-pct(b);
  return {ok:true,delta:d,
    phrase:d>4?"Los momentos buenos ganaron espacio respecto al periodo anterior ("+(d>0?"+":"")+d+" pts)."
      :d<-4?"Los estados difíciles ganaron espacio respecto al periodo anterior ("+d+" pts)."
      :"Proporción similar al periodo anterior."};
}
export function moodEmotions(state,dayIds){
  const counts={};
  stateEventsOf(state,dayIds).forEach(e=>{
    const em=(e.context||{}).emotion; if(em) counts[em]=(counts[em]||0)+1;});
  return Object.keys(counts).map(k=>({key:k,label:EMOTION_LABEL[k]||k,n:counts[k]}))
    .sort((x,y)=>y.n-x.n);
}
export function moodDayparts(state,dayIds){
  const parts={}; DAYPARTS.forEach(p=>{parts[p.id]={bien:0,neutral:0,dificil:0,emo:{}};});
  const evs=stateEventsOf(state,dayIds);
  evs.forEach(e=>{
    const p=parts[daypartOf(e.createdAt)];
    p[e.subtype]=(p[e.subtype]||0)+1;
    const em=(e.context||{}).emotion; if(em) p.emo[em]=(p.emo[em]||0)+1;});
  const n=evs.length;
  const evidence=n>=20?"sólida":n>=8?"parcial":"insuficiente";
  let best=null,bmx=-1,worst=null,wmx=-1;
  DAYPARTS.forEach(p=>{
    const x=parts[p.id];
    if(x.bien>bmx){bmx=x.bien;best=p.id;}
    if(x.dificil>wmx){wmx=x.dificil;worst=p.id;}});
  const perEmo={};
  DAYPARTS.forEach(p=>Object.keys(parts[p.id].emo).forEach(em=>{
    const c=parts[p.id].emo[em];
    if(!perEmo[em]||c>perEmo[em].n) perEmo[em]={part:p.id,n:c};}));
  return {parts,n,evidence,best:bmx>0?best:null,worst:wmx>0?worst:null,perEmo};
}
