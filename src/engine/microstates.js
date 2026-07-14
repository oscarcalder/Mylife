import { nowISO } from "../utils/time.js";
import { dayEvents } from "./logicalDay.js";
import { openDayRO } from "./logicalDay.js";
import { NICOTINE_IDS } from "../data/catalogs.js";
/* =====================================================================
   MÓDULO: engine/microstates.js (Addendum VI)
   Microestado actual (máx. 1, con evidencia), microvictoria y vectores.
   Nunca identidad; siempre explicación tocable.
===================================================================== */
const ctxIs=(o,k,vals)=>((o.inferred||{})[k]&&vals.includes((o.inferred||{})[k]))
  ||((o.context||{})[k]&&vals.includes((o.context||{})[k]));
function recent(state,min){
  const cut=Date.now()-min*60000;
  return state.events.filter(e=>new Date(e.createdAt).getTime()>cut);
}
export function inferMicrostate(state){
  const r120=recent(state,120), r90=recent(state,90), r60=recent(state,60);
  const subs60=r60.filter(e=>e.eventType==="substance");
  // prioridad clínica del más específico al más general
  if(subs60.length>=3){
    const span=Math.round((new Date(subs60[subs60.length-1].createdAt)-new Date(subs60[0].createdAt))/60000);
    return {key:"acelerado",emoji:"⚡",label:"Acelerado",
      explain:subs60.length+" consumos en "+Math.max(span,1)+" minutos."};
  }
  const rumi90=r90.filter(e=>ctxIs(e,"attention",["rumiacion"]));
  if(rumi90.length>=2)
    return {key:"en_bucle",emoji:"🧠",label:"En bucle",
      explain:rumi90.length+" registros de rumiación en 90 minutos, sin dato nuevo."};
  const comp=r120.filter(e=>ctxIs(e,"mentalIntent",["comprobar"])
    ||ctxIs(e,"emotion",["incertidumbre"]));
  if(comp.length>=2)
    return {key:"buscando_certeza",emoji:"🌫️",label:"Buscando certeza",
      explain:comp.length+" señales de comprobación/incertidumbre en 2 horas."};
  // alivio: consumo ≤15 min después de estado difícil, 2+ veces hoy
  const day=openDayRO(state);
  if(!day) return null;
  const evs=dayEvents(state,day.id);
  let alivio=0;
  evs.forEach((e,i)=>{
    if(e.eventType==="state"&&e.subtype==="dificil"){
      const t=new Date(e.createdAt).getTime();
      if(evs.some(o=>o.eventType==="substance"
        &&new Date(o.createdAt).getTime()-t>0
        &&new Date(o.createdAt).getTime()-t<15*60000)) alivio++;
    }});
  if(alivio>=2)
    return {key:"buscando_alivio",emoji:"🚪",label:"Buscando alivio",
      explain:alivio+" veces hoy el consumo llegó a menos de 15 minutos de un estado difícil."};
  const celos=r120.filter(e=>ctxIs(e,"emotion",["celos","insuficiencia"]));
  if(celos.length>=2)
    return {key:"comparandote",emoji:"🪞",label:"Comparándote",
      explain:celos.length+" registros de comparación/insuficiencia en 2 horas."};
  const evade=r120.filter(e=>ctxIs(e,"mentalIntent",["evitar","escapar"]));
  if(evade.length>=2)
    return {key:"postergando",emoji:"⏳",label:"Postergando",
      explain:evade.length+" señales de evasión en 2 horas."};
  const regul=r60.filter(e=>e.eventType==="intervention"
    &&e.contract&&e.contract.outcome&&e.contract.outcome.behaviorChanged);
  if(regul.length>=1)
    return {key:"recuperando",emoji:"🎛️",label:"Recuperando control",
      explain:"Hace poco un impulso terminó en conducta distinta."};
  const lastGood=r60.filter(e=>e.eventType==="state"&&e.subtype==="bien");
  const lastBad=r60.filter(e=>e.eventType==="state"&&e.subtype==="dificil");
  if(lastGood.length>=1&&lastBad.length===0&&subs60.length<=1)
    return {key:"en_paz",emoji:"🌿",label:"En paz",
      explain:"Momento bueno reciente, sin difícil ni consumo encadenado después."};
  return null; // evidencia débil = silencio
}
export function buildMicrovictory(state){
  const day=openDayRO(state);
  if(!day) return null;
  const evs=dayEvents(state,day.id);
  const ints=evs.filter(e=>e.eventType==="intervention"&&e.contract&&e.contract.outcome);
  // 1) patrón roto / 2) impulso tolerado
  const tol=ints.filter(e=>e.contract.outcome.behaviorChanged);
  if(tol.length){
    const r=tol[tol.length-1];
    if(r.contract.outcome.intensityAfter!=null&&r.contract.outcome.intensityAfter>=6)
      return {text:"La intensidad no bajó mucho, y aun así no obedeciste el impulso. Eso cuenta doble.",kind:"impulso_tolerado"};
    return {text:"Apareció el impulso y la conducta fue otra. Patrón interrumpido.",kind:"patron_roto"};
  }
  // 3) automatismo detectado
  if(ints.some(e=>e.subtype==="impulso_automatico"))
    return {text:"Viste un consumo automático mientras ocurría. Detectarlo es el primer eslabón roto.",kind:"automatismo_detectado"};
  // 4) emoción sostenida sin consumo ±30m
  const dif=evs.filter(e=>e.eventType==="state"&&e.subtype==="dificil");
  for(const d of dif){
    const t=new Date(d.createdAt).getTime();
    const near=evs.some(o=>o.eventType==="substance"&&Math.abs(new Date(o.createdAt)-t)<30*60000);
    if(!near&&Date.now()-t>30*60000){
      const em=(d.context||{}).emotion;
      return {text:"Sostuviste "+(em?("la "+em):"un estado difícil")+" sin convertirla en consumo ni simulación.",kind:"emocion_sostenida"};
    }
  }
  // 5) acción adulta / 6) microacción / 7) deliberado / 8) experimento
  if(ints.some(e=>e.context&&e.context.adultAction))
    return {text:"Hubo acción adulta concreta hoy. Un paso vale más que el plan perfecto.",kind:"accion_adulta"};
  if(evs.some(e=>e.eventType==="microAction"))
    return {text:"Una microacción movió el día. Pequeño y real gana a grande e imaginario.",kind:"microaccion"};
  if(ints.some(e=>e.subtype==="impulso_recompensa"))
    return {text:"Convertiste un premio automático en decisión. Eso es regulación.",kind:"deliberado"};
  const expDone=(state.experiments||[]).filter(x=>x.status==="compatible");
  if(expDone.length&&evs.some(e=>e.eventType==="wake"))
    return null; // el experimento ya lo celebra el Científico
  return null; // nada real, nada que premiar
}
export function dayVectors(state,dayId){
  const evs=dayEvents(state,dayId);
  const v={construccion:[],exploracion:[],evasion:[],rumiacion:[]};
  evs.forEach(e=>{
    if(e.eventType==="work"||e.eventType==="exercise"||e.eventType==="microAction"
      ||e.eventType==="train"||(e.eventType==="intervention"&&e.context&&e.context.adultAction))
      v.construccion.push(e);
    else if(e.eventType==="leisure"
      ||(e.eventType==="state"&&e.subtype==="bien"&&ctxIs(e,"goodWhat",["naturaleza","curiosidad"])))
      v.exploracion.push(e);
    else if(ctxIs(e,"mentalIntent",["evitar","escapar"])
      ||(e.eventType==="intervention"&&e.subtype==="impulso_evasion"))
      v.evasion.push(e);
    else if(ctxIs(e,"attention",["rumiacion","futuro_imaginario"])
      ||ctxIs(e,"mentalIntent",["comprobar"]))
      v.rumiacion.push(e);
  });
  const n=v.construccion.length+v.exploracion.length+v.evasion.length+v.rumiacion.length;
  if(n<6) return {ok:false,msg:"Aún hay pocos datos hoy para trazar vectores."};
  const pct=k=>Math.round(v[k].length/n*100);
  const label={work:"trabajo",exercise:"ejercicio",microAction:"microacción",train:"entrenamiento",
    intervention:"intervención",leisure:"ocio",state:"estado",substance:"consumo"};
  const who=k=>{
    const c={}; v[k].forEach(e=>{const l=label[e.eventType]||e.eventType;c[l]=(c[l]||0)+1;});
    return Object.keys(c).map(x=>x+" ×"+c[x]).join(", ");};
  return {ok:true,n,
    vectors:[
      {key:"construccion",emoji:"🧱",label:"Construcción",pct:pct("construccion"),from:who("construccion")},
      {key:"exploracion",emoji:"🧭",label:"Exploración",pct:pct("exploracion"),from:who("exploracion")},
      {key:"evasion",emoji:"🚪",label:"Evasión",pct:pct("evasion"),from:who("evasion")},
      {key:"rumiacion",emoji:"🔄",label:"Rumiación",pct:pct("rumiacion"),from:who("rumiacion")}]};
}
export const FOCUS_OPTIONS=[
  ["impulso","Mi primer impulso"],["emocion","Mi primera emoción"],
  ["consumo","Mi primer consumo"],["incertidumbre","Mi incertidumbre"],
  ["energia","Mi energía"],["cuerpo","Mi cuerpo"],["nada","Nada específico"]];
export function setFocusTomorrow(state,choice){
  state.focusTomorrow={choice,setAt:nowISO()};
}
export function checkFocus(state){
  const f=state.focusTomorrow;
  if(!f||!f.choice||f.choice==="nada") return null;
  const day=openDayRO(state);
  if(!day) return null;
  const evs=dayEvents(state,day.id);
  const rel={impulso:e=>e.eventType==="intervention"||e.eventType==="substance",
    emocion:e=>e.eventType==="state"&&(e.context||{}).emotion,
    consumo:e=>e.eventType==="substance",
    incertidumbre:e=>ctxIs(e,"emotion",["incertidumbre"])||ctxIs(e,"mentalIntent",["comprobar"]),
    energia:e=>e.eventType==="wake"||e.eventType==="exercise",
    cuerpo:e=>e.eventType==="body"}[f.choice];
  const hits=rel?evs.filter(rel):[];
  if(!hits.length) return null;
  const lbl={impulso:"tu primer impulso",emocion:"tu primera emoción",consumo:"tu primer consumo",
    incertidumbre:"tu incertidumbre",energia:"tu energía",cuerpo:"tu cuerpo"}[f.choice];
  return {choice:f.choice,n:hits.length,
    text:"🎯 Sobre tu foco de hoy ("+lbl+"): ya hay "+hits.length+" registro"+(hits.length>1?"s":"")+" relacionado"+(hits.length>1?"s":"")+"."};
}
