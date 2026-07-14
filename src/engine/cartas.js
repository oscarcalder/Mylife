import { NICOTINE_IDS } from "../data/catalogs.js";
import { OPTION_LABELS } from "../data/questionBank.js";
import { alcoholKcalOfDay, avgIntervalBetween, dominantEmotion, firstNicotineMinAfterWake, substanceEvents } from "./calculations.js";
import { CONF_PREFIX, bestToolOf, detectedMechanisms } from "./director.js";
import { buildInsights } from "./insightsEngine.js";
import { closedDays, dayEvents, logicalDayNumber } from "./logicalDay.js";
import { mostSkippedVariable } from "./questionSelector.js";
import { dateKey, fmtDur, nowISO, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/cartas.js  (v2 RC2)
   Reportes clínicos: evolución medida, hipótesis, experimentos,
   victoria y siguiente objetivo. No frases bonitas.
===================================================================== */
export const FOCOS = [
  "Observa qué aparece justo antes del primer consumo.",
  "Nota dónde está tu atención al despertar.",
  "Registra el cuerpo una vez antes de mediodía.",
  "Mide cuánto puedes esperar ante un impulso.",
];
export function avgOverDays(state, dayIds, fn){
  const vals=dayIds.map(id=>fn(id)).filter(v=>v!=null);
  return vals.length? vals.reduce((a,b)=>a+b,0)/vals.length : null;
}
export function buildCartaDiaria(state, day){
  const evs=dayEvents(state,day.id);
  const nic=substanceEvents(state,NICOTINE_IDS,day.id).length;
  const alc=substanceEvents(state,["alcohol"],day.id).length;
  const mota=substanceEvents(state,["mota"],day.id).length;
  const dom=dominantEmotion(state,day.id);
  const micro=evs.filter(e=>e.eventType==="microAction").length;
  const ex=evs.filter(e=>e.eventType==="exercise").length;
  const waits=evs.filter(e=>e.context&&e.context.couldWait==="si").length;
  const cds=closedDays(state).slice(-7).map(d=>d.id);
  const nicAvg=avgOverDays(state,cds,id=>substanceEvents(state,NICOTINE_IDS,id).length);
  const firstToday=firstNicotineMinAfterWake(state,day.id);
  const firstAvg=avgOverDays(state,cds,id=>firstNicotineMinAfterWake(state,id));
  let evolucion="Sin base de comparación todavía (se construye con los días cerrados).";
  if(nicAvg!=null){
    const dif=nic-nicAvg;
    evolucion="Nicotina: "+nic+" vs promedio "+ (Math.round(nicAvg*10)/10)
      +" ("+(dif>0.5?"+":"")+(Math.round(dif*10)/10)+")";
    if(firstToday!=null&&firstAvg!=null){
      const dm=Math.round(firstToday-firstAvg);
      evolucion+=". Primer consumo "+(dm>=0?fmtDur(Math.abs(dm))+" más tarde":fmtDur(Math.abs(dm))+" más temprano")
        +" que tu promedio.";
    } else { evolucion+="."; }
  }
  const mechs={};
  evs.forEach(e=>((e.inferred&&e.inferred.mechanisms)||[]).forEach(m=>{mechs[m]=(mechs[m]||0)+1;}));
  const topMech=Object.entries(mechs).sort((a,b)=>b[1]-a[1])[0];
  const impulses={};
  evs.forEach(e=>{ const i=e.context&&e.context.impulse; if(i&&i!=="nada") impulses[i]=(impulses[i]||0)+1; });
  const topImp=Object.entries(impulses).sort((a,b)=>b[1]-a[1])[0];
  let automatismo="Sin automatismo claro registrado.";
  if(topMech) automatismo="Mecanismo dominante: "+topMech[0]+" ("+topMech[1]+" señales)"
    +(topImp?(" · impulso más repetido: "+(OPTION_LABELS[topImp[0]]||topImp[0])):"")+".";
  else if(topImp) automatismo="El impulso más repetido fue: "+(OPTION_LABELS[topImp[0]]||topImp[0])+".";
  else if(nic>=6) automatismo="La nicotina llevó el ritmo del día ("+nic+" consumos).";
  let alternativa="No hubo respuesta alternativa registrada.";
  if(micro||ex||waits){
    const parts=[];
    if(ex) parts.push(ex+" ejercicio"+(ex>1?"s":""));
    if(micro) parts.push(micro+" microacción"+(micro>1?"es":""));
    if(waits) parts.push(waits+" espera"+(waits>1?"s":"")+" ante impulso");
    alternativa="Respuesta alternativa: "+parts.join(", ")+".";
  }
  const ins=buildInsights(state);
  const hipotesis = ins.primary
    ? CONF_PREFIX[ins.primary.h.status]+ins.primary.h.title
      +" (confianza "+ins.primary.h.confidence+"%)."
    : "Sin hipótesis destacada todavía.";
  const pend=state.experiments.find(x=>x.status==="activo");
  const doneToday=state.experiments.find(x=>["compatible","parcial","contradicho","inconcluso"].includes(x.status)
    && x.resolvedAt && dateKey(x.resolvedAt)===dateKey(nowISO()));
  const experimento = doneToday
    ? "Experimento cerrado hoy: \""+doneToday.text+"\" → "
      +doneToday.status+"."
    : pend ? "Experimento activo: "+pend.text
    : "Sin experimento activo.";
  const victoria = ins.victory ? ins.victory.text : "—";
  const foco = pend ? pend.text
    : (ins.primary&&ins.primary.h.suggestedExperiment) ? ins.primary.h.suggestedExperiment
    : FOCOS[closedDays(state).length % FOCOS.length];
  return {
    id:uid(), type:"daily", dayId:day.id, createdAt:nowISO(),
    content:{
      resumen:"Día lógico #"+logicalDayNumber(state)+": "+evs.length+" eventos. Nicotina "+nic
        +", alcohol "+alc+", mota "+mota+".",
      evolucion,
      emocion: dom ? ("Predominó "+(dom.emotion||dom.branch)+" ("+dom.count+" registros).")
        : "No se registró estado emocional hoy.",
      automatismo, alternativa, hipotesis, experimento,
      victoria:"Victoria: "+victoria,
      foco:"Mañana: "+foco,
    }
  };
}
export function buildCarta3(state){
  const cds=closedDays(state);
  const last3=cds.slice(-3);
  if(last3.length<3) return null;
  const ids=last3.map(d=>d.id);
  const prev3=cds.slice(-6,-3).map(d=>d.id);
  const sum=(dayIds,ids2)=>dayIds.reduce((s,d)=>s+substanceEvents(state,ids2,d).length,0);
  const nicNow=sum(ids,NICOTINE_IDS), nicPrev=prev3.length===3?sum(prev3,NICOTINE_IDS):null;
  const alcKNow=ids.reduce((s,d)=>s+alcoholKcalOfDay(state,d),0);
  const alcKPrev=prev3.length===3?prev3.reduce((s,d)=>s+alcoholKcalOfDay(state,d),0):null;
  const sleeps=state.sleepSessions.filter(s=>s.type==="mainSleep"&&s.durationMin).slice(-3);
  const sleepAvg=sleeps.length?Math.round(sleeps.reduce((a,b)=>a+b.durationMin,0)/sleeps.length/6)/10:null;
  const intAvg=avgIntervalBetween(state,NICOTINE_IDS,3);
  const mechs=detectedMechanisms(state);
  const ins=buildInsights(state);
  let cambios=[];
  if(nicPrev!=null) cambios.push("nicotina "+nicPrev+" → "+nicNow);
  else cambios.push("nicotina "+nicNow+" (sin trío previo para comparar)");
  if(alcKPrev!=null) cambios.push("alcohol "+alcKPrev+" → "+alcKNow+" kcal");
  else cambios.push("alcohol "+alcKNow+" kcal");
  if(intAvg!=null) cambios.push("intervalo promedio entre nicotina: "+fmtDur(intAvg));
  if(sleepAvg!=null) cambios.push("sueño promedio: "+sleepAvg+" h");
  const newest=state.hypotheses.slice().sort((a,b)=>(a.createdAt<b.createdAt?1:-1))[0];
  const strongest=state.hypotheses.slice().sort((a,b)=>b.confidence-a.confidence)[0];
  let hipotesis="Sin hipótesis todavía.";
  if(strongest){
    hipotesis="Consolidada: "+CONF_PREFIX[strongest.status]+strongest.title
      +" ("+strongest.confidence+"%).";
    if(newest&&newest.key!==strongest.key)
      hipotesis+=" Nueva: "+newest.title+" ("+newest.confidence+"%).";
  }
  const done=state.experiments.filter(x=>["compatible","parcial","contradicho","inconcluso"].includes(x.status)).slice(-3);
  const experimentos=done.length
    ? done.map(x=>"\""+x.text+"\" → "+x.status).join(" · ")
    : "Ningún experimento cerrado en este ciclo.";
  const tool=bestToolOf(state);
  const herramienta=tool
    ? "La herramienta con mejor peso personal: "+tool.key+" ("+tool.weight+"/100)."
    : "Aún no hay evidencia de qué herramienta te ayuda más.";
  const skipped=mostSkippedVariable(state);
  const evitando=skipped
    ? "La pregunta que más saltas apunta a: "+skipped.variable
      +" ("+skipped.skips+" veces). Lo que se evita suele ser la puerta."
    : (mechs.some(m=>m[0]==="rumiación"||m[0]==="anticipación")
      ? "Pregunta incómoda: ¿el tema que rumias es el problema real, o es donde tu mente se esconde de otra cosa?"
      : "Pregunta incómoda: ¿qué emoción no has registrado ni una vez estos 3 días?");
  const pend=state.experiments.find(x=>x.status==="activo");
  const objetivo=pend ? "Cerrar el experimento activo: "+pend.text
    : ins.primary&&ins.primary.h.suggestedExperiment ? ins.primary.h.suggestedExperiment
    : "Registrar lugar antes del primer consumo de mañana.";
  return {
    id:uid(), type:"3d", dayId:last3[2].id, createdAt:nowISO(),
    content:{
      patron: mechs.length ? ("Lo que más se repite: "+mechs[0][0]+" ("+mechs[0][1]+" señales).")
        : "Todavía no hay un patrón repetido claro.",
      cambios:"Cambios del ciclo: "+cambios.join(" · ")+".",
      hipotesis, experimentos:"Experimentos: "+experimentos,
      herramienta, evitando,
      objetivo:"Siguiente objetivo: "+objetivo,
    }
  };
}

