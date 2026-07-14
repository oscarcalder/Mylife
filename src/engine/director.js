import { NICOTINE_IDS } from "../data/catalogs.js";
import { INTERVENTIONS } from "../data/interventions.js";
import { firstNicotineMinAfterWake, lastEventOf, substanceEvents, wakeEventOfDay } from "./calculations.js";
import { addEvent } from "./events.js";
import { latentDecayed } from "./latentVars.js";
import { closedDays } from "./logicalDay.js";
import { dayStats } from "./snapshots.js";
import { hourOf, minsBetween, nowISO, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/director.js  (v2 RC2)
   Descubre patrones no obvios. Confianza = evidencia + recencia +
   consistencia − contradicción ± resultado de experimentos.
   Nunca etiqueta a la persona; nombra mecanismos.
===================================================================== */
export function calcConfidence(evidenceCount, recencyScore, consistencyScore, contradictionScore, expAdjust){
  const evidenceScore = Math.min(100, evidenceCount*20);
  let score = evidenceScore*0.35 + recencyScore*0.2 + consistencyScore*0.35
    - contradictionScore*0.3 + (expAdjust||0);
  return Math.max(0, Math.min(100, Math.round(score)));
}
export function statusFor(confidence){
  if(confidence<25) return "initial";
  if(confidence<50) return "emerging";
  if(confidence<75) return "probable";
  return "solid";
}
export const STATUS_LABEL={initial:"inicial",emerging:"emergente",probable:"probable",solid:"sólida"};
export const CONF_PREFIX={
  initial:"Podría ser: ", emerging:"Empiezo a ver: ",
  probable:"Parece repetirse: ", solid:"Ya es un patrón: "
};
export function recencyScoreOf(iso){
  if(!iso) return 0;
  const days=(Date.now()-new Date(iso).getTime())/86400000;
  if(days<=1) return 100;
  if(days<=3) return 70;
  if(days<=7) return 40;
  return 15;
}
/* ---------- utilidades de detección ---------- */
export function evWith(state, pred){ return state.events.filter(pred); }
export function ctxIs(e, variable, values){
  return e.context && values.includes(e.context[variable]);
}
export function followedBy(state, trigger, pred, maxMin){
  return state.events.find(e=>pred(e) && e.createdAt>trigger.createdAt
    && minsBetween(trigger.createdAt, e.createdAt)<=maxMin);
}
export function seqHypothesis(state, key, title, mechanism, exp, triggers, followPred, windowMin, minHits){
  if(triggers.length < (minHits||2)) return null;
  let hits=0; const evidence=[]; let lastAt=null;
  triggers.forEach(t=>{
    const after=followedBy(state,t,followPred,windowMin);
    if(after){ hits++; evidence.push(t.id, after.id); lastAt=after.createdAt; }
  });
  if(hits < (minHits||2)) return null;
  const consistency=Math.round(hits/triggers.length*100);
  const contradictions=triggers.length-hits;
  const inputs={ev:hits,rec:recencyScoreOf(lastAt),cons:consistency,contra:(100-consistency)*0.4};
  return { key, title, mechanism, evidenceEventIds:evidence, contradictions, confInputs:inputs,
    confidence: calcConfidence(inputs.ev,inputs.rec,inputs.cons,inputs.contra),
    suggestedExperiment: exp };
}
export function shareHypothesis(state, key, title, mechanism, exp, matches, total, minN, minShare){
  if(total < minN) return null;
  const share = matches.length/total;
  if(share < minShare) return null;
  const lastAt = matches.length? matches[matches.length-1].createdAt : null;
  const inputs={ev:matches.length,rec:recencyScoreOf(lastAt),
    cons:Math.round(share*100),contra:Math.round((1-share)*100)*0.5};
  return { key, confInputs:inputs,
    title: title.replace("{X}",String(matches.length)).replace("{Y}",String(total)),
    mechanism, evidenceEventIds:matches.map(e=>e.id),
    contradictions: total-matches.length,
    confidence: calcConfidence(matches.length, recencyScoreOf(lastAt),
      Math.round(share*100), Math.round((1-share)*100)*0.5),
    suggestedExperiment: exp };
}
/* ---------- detectores ---------- */
export function detRumiacionPreConsumo(state){
  const triggers=evWith(state,e=>
    (e.eventType==="state"||e.eventType==="sos"||e.eventType==="resolver") &&
    e.inferred && (e.inferred.attention==="rumiacion"||e.inferred.attention==="futuro_imaginario"||
      (e.inferred.mechanisms||[]).includes("rumiación")));
  return seqHypothesis(state,"rumiacion_pre_consumo",
    "la rumiación aparece antes del consumo, no las ganas de fumar","rumiación",
    "La próxima vez que notes rumiación, espera 2 minutos antes del siguiente consumo y registra qué pasó.",
    triggers, e=>e.eventType==="substance", 90, 2);
}
export function detCuerpoPreConsumo(state){
  const bodyVals=["pecho","garganta","mandibula","cuello","tension","estomago"];
  const triggers=evWith(state,e=>(e.eventType==="state"||e.eventType==="body")
    && ctxIs(e,"body",bodyVals));
  return seqHypothesis(state,"cuerpo_pre_consumo",
    "la tensión corporal aparece antes del consumo","activación corporal",
    "Cuando notes tensión, registra el cuerpo antes de fumar: vamos a medir la secuencia.",
    triggers, e=>e.eventType==="substance", 60, 2);
}
export function detEnergiaPrimerConsumo(state){
  const rows=[];
  state.logicalDays.forEach(d=>{
    const wake=wakeEventOfDay(state,d.id);
    if(!wake||!wake.context||!wake.context.wakeEnergy) return;
    const m=firstNicotineMinAfterWake(state,d.id);
    if(m==null) return;
    rows.push({energy:wake.context.wakeEnergy, mins:m, id:wake.id});
  });
  const low=rows.filter(r=>r.energy==="baja"||r.energy==="agotado");
  const high=rows.filter(r=>r.energy==="alta"||r.energy==="media");
  if(low.length<2||high.length<2) return null;
  const avgLow=low.reduce((s,r)=>s+r.mins,0)/low.length;
  const avgHigh=high.reduce((s,r)=>s+r.mins,0)/high.length;
  if(avgHigh-avgLow<20) return null;
  return { key:"energia_primer_consumo",
    title:"los días con baja energía adelantan el primer consumo de nicotina",
    mechanism:"regulación con sustancia",
    evidenceEventIds:rows.map(r=>r.id), contradictions:0,
    confInputs:{ev:low.length+high.length,rec:60,cons:70,contra:15},
    confidence:calcConfidence(low.length+high.length,60,70,15),
    suggestedExperiment:"Mañana que despiertes con baja energía, mete una microacción antes del primer IQOS y registra si se retrasa." };
}
export function detEjercicioVespertino(state){
  const cds=closedDays(state);
  if(cds.length<4) return null;
  const withEx=[], withoutEx=[];
  cds.forEach(d=>{
    const hasEx=state.events.some(e=>e.logicalDayId===d.id&&e.eventType==="exercise");
    const evening=substanceEvents(state,NICOTINE_IDS.concat(["alcohol"]),d.id)
      .filter(e=>hourOf(e.createdAt)>=17).length;
    (hasEx?withEx:withoutEx).push(evening);
  });
  if(withEx.length<2||withoutEx.length<2) return null;
  const avgW=withEx.reduce((a,b)=>a+b,0)/withEx.length;
  const avgWo=withoutEx.reduce((a,b)=>a+b,0)/withoutEx.length;
  if(avgWo-avgW<1) return null;
  return { key:"ejercicio_vespertino",
    title:"los días sin ejercicio aumenta el consumo vespertino",
    mechanism:"regulación con sustancia", evidenceEventIds:[], contradictions:0,
    confInputs:{ev:withEx.length+withoutEx.length,rec:50,cons:65,contra:15},
    confidence:calcConfidence(withEx.length+withoutEx.length,50,65,15),
    suggestedExperiment:"En un día sin ejercicio formal, mete una microacción a las 5 pm y compara la tarde." };
}
export function detAnticipacionManana(state){
  const all=evWith(state,e=>ctxIs(e,"mentalIntent",["anticipar","prepararte"])
    || (e.inferred&&(e.inferred.mechanisms||[]).includes("anticipación")));
  const morning=all.filter(e=>hourOf(e.createdAt)<13);
  return shareHypothesis(state,"anticipacion_manana",
    "la anticipación se concentra en la mañana: el peso está antes del evento, no durante ({X} de {Y})",
    "anticipación",
    "Al llegar al consultorio, registra cómo fue el día real contra lo que anticipaste en la mañana.",
    morning, all.length, 4, 0.65);
}
export function detIncertidumbreComprobar(state){
  const unc=evWith(state,e=>ctxIs(e,"emotion",["incertidumbre"]));
  const paired=unc.filter(e=>ctxIs(e,"mentalIntent",["comprobar","controlar","anticipar"]));
  return shareHypothesis(state,"incertidumbre_comprobar",
    "cuando aparece incertidumbre, la mente intenta comprobar o controlar en vez de tolerar ({X} de {Y})",
    "búsqueda de certeza",
    "La próxima incertidumbre: 2 minutos sin comprobar nada. Sólo observa qué hace el impulso.",
    paired, unc.length, 3, 0.6);
}
export function detVacioConsumo(state){
  const triggers=evWith(state,e=>ctxIs(e,"emotion",["vacio"])||ctxIs(e,"underneath",["falta_estimulo"]));
  return seqHypothesis(state,"vacio_consumo",
    "el vacío se está llenando con consumo antes de alcanzar a sentirse","intolerancia a vacío",
    "Cuando notes vacío o falta de estímulo, quédate 2 minutos sin llenarlo y registra qué pasó.",
    triggers, e=>e.eventType==="substance", 60, 2);
}
export function detJuezTrabajo(state){
  const triggers=evWith(state,e=>ctxIs(e,"mentalIntent",["castigarte"])||ctxIs(e,"emotion",["culpa"]));
  if(triggers.length<2) return null;
  const linked=triggers.filter(t=>ctxIs(t,"precursor",["trabajo"]) ||
    (function(){ const p=lastEventOf({events:state.events.filter(e=>e.createdAt<t.createdAt)},"place");
      return p&&(p.subtype==="Consultorio"||p.subtype==="Quirófano"); })());
  return shareHypothesis(state,"juez_trabajo",
    "el juez interno se activa alrededor del trabajo, no de errores reales ({X} de {Y})",
    "juez interno",
    "La próxima autocrítica en el trabajo: escribe el error verificable en una línea. Si no existe, es el juez.",
    linked, triggers.length, 2, 0.5);
}
export function detFatalismo(state){
  const stories=evWith(state,e=>e.context&&e.context.story);
  const dark=stories.filter(e=>ctxIs(e,"story",["saldra_mal","sin_solucion","deterioro","no_podre","nunca_cambia"]));
  return shareHypothesis(state,"fatalismo",
    "las historias mentales tienden al fatalismo: casi siempre terminan mal en tu cabeza ({X} de {Y})",
    "catastrofización",
    "En la próxima historia, agrega la versión neutra en una línea: qué pasaría si nada empeora.",
    dark, stories.length, 3, 0.6);
}
export function detEvitacionImpulso(state){
  const triggers=evWith(state,e=>ctxIs(e,"mentalIntent",["evitar_sentir"])
    ||ctxIs(e,"need",["desconexion","escape"]));
  return seqHypothesis(state,"evitacion_impulso",
    "el consumo funciona como salida de emociones, no como deseo","evitación",
    "Antes del próximo consumo por escape, nombra en una palabra qué emoción estás evitando.",
    triggers, e=>e.eventType==="substance"||ctxIs(e,"impulse",["aislarme"]), 45, 2);
}
export function detCompulsionSinEspacio(state){
  const waits=evWith(state,e=>e.context&&e.context.couldWait);
  const noSpace=waits.filter(e=>ctxIs(e,"couldWait",["no","no_intente"]));
  const h1=shareHypothesis(state,"compulsion_sin_espacio",
    "el consumo ocurre sin espacio de decisión: {X} de {Y} veces sin intentar esperar",
    "compulsión / obediencia",
    "Una sola vez hoy: 2 minutos entre el impulso y el consumo. Registra si baja o sube.",
    noSpace, waits.length, 4, 0.7);
  if(h1) return h1;
  const autos=evWith(state,e=>e.context&&e.context.automaticity);
  const auto=autos.filter(e=>ctxIs(e,"automaticity",["automatico"]));
  return shareHypothesis(state,"compulsion_sin_espacio",
    "el consumo está siendo automático: {X} de {Y} sin decisión consciente",
    "compulsión / obediencia",
    "Una sola vez hoy: 2 minutos entre el impulso y el consumo. Registra si baja o sube.",
    auto, autos.length, 4, 0.7);
}
export function detConsumoReloj(state){
  const cutoff=Date.now()-7*86400000;
  const evs=substanceEvents(state,NICOTINE_IDS).filter(e=>new Date(e.createdAt).getTime()>cutoff);
  if(evs.length<8) return null;
  const ints=[];
  for(let i=1;i<evs.length;i++){
    const m=minsBetween(evs[i-1].createdAt,evs[i].createdAt);
    if(m>0&&m<360) ints.push(m);
  }
  if(ints.length<6) return null;
  const mean=ints.reduce((a,b)=>a+b,0)/ints.length;
  const sd=Math.sqrt(ints.reduce((s,x)=>s+(x-mean)*(x-mean),0)/ints.length);
  if(sd/mean>=0.35) return null;
  return { key:"consumo_reloj",
    title:"la nicotina sigue un reloj interno (cada ~"+Math.round(mean)+" min), más que necesidades reales",
    mechanism:"consumo automático",
    evidenceEventIds:evs.slice(-8).map(e=>e.id), contradictions:0,
    confInputs:{ev:ints.length,rec:80,cons:Math.round((1-sd/mean)*100),contra:10},
    confidence:calcConfidence(ints.length,80,Math.round((1-sd/mean)*100),10),
    suggestedExperiment:"Rompe el reloj una vez: retrasa un consumo 10 minutos y registra qué pasó con las ganas." };
}
export function detSobrecontrol(state){
  const l=state.latent&&state.latent.control;
  const evs=evWith(state,e=>ctxIs(e,"mentalIntent",["controlar"])||ctxIs(e,"need",["control"]));
  if(!l||latentDecayed(l)<65||evs.length<4) return null;
  return { key:"sobrecontrol",
    title:"el control aparece como respuesta a casi todo, incluso a lo que no lo necesita",
    mechanism:"necesidad de control",
    evidenceEventIds:evs.slice(-6).map(e=>e.id), contradictions:0,
    confInputs:{ev:evs.length,rec:recencyScoreOf(evs[evs.length-1].createdAt),cons:70,contra:15},
    confidence:calcConfidence(evs.length,recencyScoreOf(evs[evs.length-1].createdAt),70,15),
    suggestedExperiment:"Hoy suelta una decisión pequeña a propósito y registra qué hizo la ansiedad." };
}
export function detFuturoDominante(state){
  const att=evWith(state,e=>(e.context&&e.context.attentionDirection)||(e.inferred&&e.inferred.attention));
  const fut=att.filter(e=>{
    const a=(e.context&&e.context.attentionDirection)||(e.inferred&&e.inferred.attention);
    return a==="futuro_imaginario"||a==="fantasia";
  });
  return shareHypothesis(state,"futuro_dominante",
    "tu atención vive en futuros imaginarios ({X} de {Y} registros)",
    "simulación de futuros",
    "Tres veces hoy, pregúntate: ¿esto está pasando o lo estoy simulando? Registra la respuesta honesta.",
    fut, att.length, 4, 0.5);
}
export function detPasadoDominante(state){
  const att=evWith(state,e=>(e.context&&e.context.attentionDirection)||(e.inferred&&e.inferred.attention));
  const past=att.filter(e=>{
    const a=(e.context&&e.context.attentionDirection)||(e.inferred&&e.inferred.attention);
    return a==="pasado";
  });
  return shareHypothesis(state,"pasado_dominante",
    "la atención regresa al pasado con frecuencia ({X} de {Y} registros)",
    "rumiación",
    "Cuando notes el regreso al pasado, nombra qué historia intenta cerrar tu mente.",
    past, att.length, 4, 0.4);
}
export function detCelosPelicula(state){
  const celos=evWith(state,e=>ctxIs(e,"emotion",["celos"]));
  const conFuturo=celos.filter(e=>ctxIs(e,"attentionDirection",["futuro_imaginario","fantasia"])
    ||(e.inferred&&["futuro_imaginario","fantasia"].includes(e.inferred.attention)));
  return shareHypothesis(state,"celos_pelicula",
    "los celos llegan como películas de futuro, no como hechos presentes ({X} de {Y})",
    "simulación de futuros",
    "En el próximo episodio de celos: separa en dos líneas el hecho verificable y la película.",
    conFuturo, celos.length, 2, 0.5);
}
export function detInsuficiencia(state){
  const evs=evWith(state,e=>ctxIs(e,"emotion",["insuficiencia"])
    ||(ctxIs(e,"mentalIntent",["castigarte"])&&ctxIs(e,"emotion",["culpa"])));
  if(evs.length<3) return null;
  return { key:"insuficiencia",
    title:"la sensación de insuficiencia aparece ligada a autoexigencia, no a resultados reales",
    mechanism:"autoexigencia",
    evidenceEventIds:evs.map(e=>e.id), contradictions:0,
    confInputs:{ev:evs.length,rec:recencyScoreOf(evs[evs.length-1].createdAt),cons:65,contra:20},
    confidence:calcConfidence(evs.length,recencyScoreOf(evs[evs.length-1].createdAt),65,20),
    suggestedExperiment:"Anota un dato verificable de hoy que contradiga la insuficiencia. Uno basta." };
}
export const DETECTORS = {
  rumiacion_pre_consumo: detRumiacionPreConsumo,
  cuerpo_pre_consumo: detCuerpoPreConsumo,
  energia_primer_consumo: detEnergiaPrimerConsumo,
  ejercicio_vespertino: detEjercicioVespertino,
  anticipacion_manana: detAnticipacionManana,
  incertidumbre_comprobar: detIncertidumbreComprobar,
  vacio_consumo: detVacioConsumo,
  juez_trabajo: detJuezTrabajo,
  fatalismo: detFatalismo,
  evitacion_impulso: detEvitacionImpulso,
  compulsion_sin_espacio: detCompulsionSinEspacio,
  consumo_reloj: detConsumoReloj,
  sobrecontrol: detSobrecontrol,
  futuro_dominante: detFuturoDominante,
  pasado_dominante: detPasadoDominante,
  celos_pelicula: detCelosPelicula,
  insuficiencia: detInsuficiencia,
};
/* Actualización incremental: qué detectores despierta cada evento */
export const EVENT_DETECTOR_MAP = {
  substance:["rumiacion_pre_consumo","cuerpo_pre_consumo","energia_primer_consumo",
    "ejercicio_vespertino","vacio_consumo","evitacion_impulso","compulsion_sin_espacio","consumo_reloj"],
  state:["rumiacion_pre_consumo","cuerpo_pre_consumo","anticipacion_manana",
    "incertidumbre_comprobar","vacio_consumo","juez_trabajo","futuro_dominante",
    "pasado_dominante","celos_pelicula","insuficiencia","sobrecontrol"],
  body:["cuerpo_pre_consumo"],
  sos:["rumiacion_pre_consumo","fatalismo","evitacion_impulso","futuro_dominante","pasado_dominante"],
  resolver:["rumiacion_pre_consumo","fatalismo","juez_trabajo","futuro_dominante",
    "pasado_dominante","insuficiencia","sobrecontrol"],
  wake:["energia_primer_consumo"],
  exercise:["ejercicio_vespertino"],
};
export function breakdownFrom(inputs, expScore){
  const inp=inputs||{ev:0,rec:0,cons:0,contra:0};
  const b={ evidencia:Math.round(Math.min(100,inp.ev*20)*0.35),
    recencia:Math.round(inp.rec*0.2),
    consistencia:Math.round(inp.cons*0.35),
    contradiccion:-Math.round(inp.contra*0.3),
    experimentos:expScore||0 };
  b.base=b.evidencia+b.recencia+b.consistencia+b.contradiccion+b.experimentos;
  b.total=Math.max(0,Math.min(100,b.base));
  b.recortado=b.base!==b.total;
  b.formula="0.35·evidencia(≤100) + 0.20·recencia + 0.35·consistencia − 0.30·contradicción ± experimentos (todo normalizado 0–100)";
  return b;
}
export function pushConfHistory(h, conf, reason){
  if(!h.confidenceHistory) h.confidenceHistory=[];
  const last=h.confidenceHistory[h.confidenceHistory.length-1];
  if(!last||Math.abs(last.confidence-conf)>=1||last.reason!==reason){
    h.confidenceHistory.push({at:nowISO(),confidence:conf,reason});
    if(h.confidenceHistory.length>60) h.confidenceHistory.shift();
  }
}
export function upsertHypothesis(state, h, reason){
  if(!h) return;
  const now=nowISO(); const why=reason||"nueva evidencia";
  const existing = state.hypotheses.find(x=>x.key===h.key);
  if(existing){
    const prev=existing.confidence;
    const conf=Math.max(0,Math.min(100,h.confidence+(existing.expScore||0)));
    existing.title=h.title; existing.mechanism=h.mechanism;
    existing.evidenceEventIds=h.evidenceEventIds;
    existing.contradictions=h.contradictions||0;
    existing.confInputs=h.confInputs;
    existing.breakdown=breakdownFrom(h.confInputs, existing.expScore);
    existing.confidence=conf; existing.status=statusFor(conf);
    existing.suggestedExperiment=h.suggestedExperiment;
    existing.updatedAt=now;
    if(conf!==prev) pushConfHistory(existing, conf, why);
  } else {
    const conf=Math.max(0,Math.min(100,h.confidence));
    const nh=Object.assign({ id:uid(), expScore:0, contradictions:0,
      status:statusFor(conf), createdAt:now, updatedAt:now,
      confidenceHistory:[] }, h, {confidence:conf});
    nh.breakdown=breakdownFrom(h.confInputs, 0);
    pushConfHistory(nh, conf, "hipótesis creada");
    state.hypotheses.push(nh);
  }
}
export function trendOfHypothesis(h){
  const hist=h.confidenceHistory||[];
  if(hist.length<2) return "→";
  const weekAgo=Date.now()-7*86400000;
  let ref=hist[0];
  for(const e of hist){ if(new Date(e.at).getTime()<=weekAgo) ref=e; }
  const d=h.confidence-ref.confidence;
  return d>=5?"↗":d<=-5?"↘":"→";
}
export function directorOnEvent(state, ev){
  const keys = EVENT_DETECTOR_MAP[ev.eventType]||[];
  keys.forEach(k=>{
    const h = DETECTORS[k](state);
    if(h) upsertHypothesis(state,h,"nueva evidencia");
  });
}
export function recalcAllHypotheses(state){
  Object.keys(DETECTORS).forEach(k=>{
    const h=DETECTORS[k](state);
    if(h) upsertHypothesis(state,h,"recálculo");
    else state.hypotheses = state.hypotheses.filter(x=>x.key!==k);
  });
}
export function detectedMechanisms(state){
  const count={};
  state.events.forEach(e=>{
    ((e.inferred&&e.inferred.mechanisms)||[]).forEach(m=>{ count[m]=(count[m]||0)+1; });
  });
  state.hypotheses.forEach(h=>{ if(h.confidence>=25) count[h.mechanism]=(count[h.mechanism]||0)+1; });
  return Object.entries(count).sort((a,b)=>b[1]-a[1]);
}
/* ---------- CIENTÍFICO: protocolo definido ANTES, evaluación medida, leyes ---------- */
export const EXPERIMENT_TEMPLATES={
  rumiacion_pre_consumo:{variable:"esperar 2 min ante rumiación",
    metric:"rumi_conv", direction:"baja",
    expected:"que menos rumiaciones terminen en consumo (90 min)",
    minCond:"al menos 2 rumiaciones registradas en la ventana",
    confounders:["sueño","alcohol"], minSamples:2},
  vacio_consumo:{variable:"2 min sin llenar el vacío",
    metric:"vacio_conv", direction:"baja",
    expected:"que menos episodios de vacío terminen en consumo",
    minCond:"al menos 2 registros de vacío", confounders:["sueño"], minSamples:2},
  energia_primer_consumo:{variable:"microacción antes del primer IQOS en días de baja energía",
    metric:"first_nic", direction:"sube",
    expected:"primer consumo más tarde",
    minCond:"al menos 2 días con energía baja y despertar registrado",
    confounders:["hora de despertar"], minSamples:2},
  compulsion_sin_espacio:{variable:"insertar una espera de 2 min una vez al día",
    metric:"wait_share", direction:"sube",
    expected:"más consumos con espacio de decisión",
    minCond:"al menos 3 respuestas de ¿podías esperar?", confounders:["estrés"], minSamples:3},
  consumo_reloj:{variable:"retrasar un consumo 10 min al día",
    metric:"interval_cv", direction:"sube",
    expected:"romper la regularidad del reloj",
    minCond:"al menos 6 intervalos de nicotina", confounders:["carga de trabajo"], minSamples:6},
};
export function daysInWindow(state, fromCount, toCount){
  return closedDays(state).slice(fromCount, toCount).map(d=>d.id);
}
export function measureMetric(state, metric, dayIds){
  const inSet=e=>dayIds.includes(e.logicalDayId);
  if(metric==="rumi_conv"||metric==="vacio_conv"){
    const pred = metric==="rumi_conv"
      ? (e=>(e.eventType==="state"||e.eventType==="sos"||e.eventType==="resolver")&&e.inferred&&
          (e.inferred.attention==="rumiacion"||(e.inferred.mechanisms||[]).includes("rumiación")))
      : (e=>ctxIs(e,"emotion",["vacio"])||ctxIs(e,"underneath",["falta_estimulo"]));
    const trig=state.events.filter(e=>inSet(e)&&pred(e));
    if(!trig.length) return {value:null,n:0};
    let hits=0;
    trig.forEach(t=>{ if(followedBy(state,t,e=>e.eventType==="substance",metric==="rumi_conv"?90:60)) hits++; });
    return {value:hits/trig.length, n:trig.length};
  }
  if(metric==="first_nic"){
    const vals=dayIds.map(id=>{
      const st=dayStats(state,id);
      return st.lowEnergy? st.firstNicMin : null;
    }).filter(v=>v!=null);
    return {value:vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null, n:vals.length};
  }
  if(metric==="wait_share"){
    const evs=state.events.filter(e=>inSet(e)&&e.context&&e.context.couldWait);
    if(!evs.length) return {value:null,n:0};
    return {value:evs.filter(e=>e.context.couldWait==="si").length/evs.length, n:evs.length};
  }
  if(metric==="interval_cv"){
    const evs=state.events.filter(e=>inSet(e)&&e.eventType==="substance"
      &&NICOTINE_IDS.includes(e.subtype));
    const ints=[];
    for(let i=1;i<evs.length;i++){
      const m=minsBetween(evs[i-1].createdAt,evs[i].createdAt);
      if(m>0&&m<360) ints.push(m);
    }
    if(ints.length<3) return {value:null,n:ints.length};
    const mean=ints.reduce((a,b)=>a+b,0)/ints.length;
    const sd=Math.sqrt(ints.reduce((s,x)=>s+(x-mean)*(x-mean),0)/ints.length);
    return {value:sd/mean, n:ints.length};
  }
  return {value:null,n:0};
}
export function acceptExperiment(state, hyp, durationDays){
  const already=state.experiments.find(x=>x.hypKey===hyp.key&&x.status==="activo");
  if(already) return already;
  const t=EXPERIMENT_TEMPLATES[hyp.key];
  const dur=durationDays||3;
  const closed=closedDays(state).length;
  const base=t? measureMetric(state,t.metric,daysInWindow(state,Math.max(0,closed-7),closed)) : null;
  const exp={ id:uid(), hypKey:hyp.key, hypothesisText:hyp.title,
    text:hyp.suggestedExperiment, status:"activo",
    createdAt:nowISO(), startAt:nowISO(), startDayCount:closed,
    durationDays:dur, closesAtDayCount:closed+dur,
    variable:t?t.variable:hyp.suggestedExperiment,
    metric:t?t.metric:null, direction:t?t.direction:null,
    expected:t?t.expected:"evaluación por auto-reporte (¿funcionó?)",
    successCriterion:t? (t.direction==="baja"?"valor ≤ 70% de la línea base":"valor ≥ 130% de la línea base")
      : "auto-reporte al cierre",
    minCond:t?t.minCond:"—", confounders:t?t.confounders:[],
    minSamples:t?t.minSamples:0,
    selfReport:!t,
    baseline:base&&base.value!=null?Math.round(base.value*1000)/1000:null,
    baselineN:base?base.n:0 };
  state.experiments.push(exp);
  addEvent(state,{eventType:"hypothesis",subtype:"experiment_accepted",
    value:exp.text, source:"system"});
  return exp;
}
export function applyExperimentOutcome(state, exp, status){
  exp.status=status; exp.resolvedAt=nowISO();
  const hyp=state.hypotheses.find(h=>h.key===exp.hypKey);
  const delta = status==="compatible"?12 : status==="parcial"?4 : status==="contradicho"?-12 : 0;
  if(hyp&&delta!==0){
    hyp.expScore=(hyp.expScore||0)+delta;
    hyp.confidence=Math.max(0,Math.min(100,hyp.confidence+delta));
    hyp.status=statusFor(hyp.confidence);
    hyp.lastExperimentResult=status;
    hyp.updatedAt=nowISO();
    hyp.breakdown=breakdownFrom(hyp.confInputs, hyp.expScore);
    pushConfHistory(hyp, hyp.confidence, "experimento "+status);
  } else if(hyp){ hyp.lastExperimentResult=status; }
  addEvent(state,{eventType:"hypothesis",subtype:"experiment_result",
    value:{text:exp.text,result:status}, source:"system"});
}
export function resolveExperiment(state, expId, result){
  const exp=state.experiments.find(x=>x.id===expId);
  if(!exp||exp.status!=="activo") return;
  const map={si:"compatible",parcial:"parcial",no:"contradicho"};
  applyExperimentOutcome(state, exp, map[result]||"inconcluso");
}
export function evaluateOpenExperiments(state){
  const closed=closedDays(state).length;
  state.experiments.filter(x=>x.status==="activo"&&!x.selfReport
    &&closed>=x.closesAtDayCount).forEach(exp=>{
    const win=daysInWindow(state, exp.startDayCount, exp.closesAtDayCount);
    const m=measureMetric(state, exp.metric, win);
    exp.resultValue=m.value!=null?Math.round(m.value*1000)/1000:null;
    exp.resultN=m.n;
    if(m.value==null||m.n<exp.minSamples||exp.baseline==null){
      applyExperimentOutcome(state, exp, "inconcluso"); return;
    }
    const r=m.value/exp.baseline;
    let status;
    if(exp.direction==="baja") status = r<=0.7?"compatible" : r<=0.9?"parcial" : "contradicho";
    else status = r>=1.3?"compatible" : r>=1.1?"parcial" : "contradicho";
    applyExperimentOutcome(state, exp, status);
  });
}
export function promoteLaws(state){
  state.hypotheses.forEach(h=>{
    if(state.laws.some(l=>l.hypKey===h.key)) return;
    const compat=state.experiments.filter(x=>x.hypKey===h.key&&x.status==="compatible").length;
    const ageDays=(Date.now()-new Date(h.createdAt).getTime())/86400000;
    if(h.confidence>=75 && compat>=2 && ageDays>=21){
      state.laws.push({ id:uid(), hypKey:h.key,
        statement:h.title.charAt(0).toUpperCase()+h.title.slice(1),
        mechanism:h.mechanism, confidence:h.confidence,
        experimentsCompatible:compat, promotedAt:nowISO() });
      addEvent(state,{eventType:"law",subtype:"promoted",value:h.title,source:"system"});
    }
  });
}
/* ---------- aprendizaje de intervenciones (pesos personales, no globales) ---------- */
export function ensureStat(state,key){
  if(!state.interventionStats[key])
    state.interventionStats[key]={helped:0,partial:0,notHelped:0,weight:50,lastUsedAt:null};
  const st=state.interventionStats[key];
  if(st.weight===undefined) st.weight=50;
  if(st.partial===undefined) st.partial=0;
  return st;
}
export function recordInterventionFeedback(state,key,result){
  const st=ensureStat(state,key);
  if(result==="si"){ st.helped++; st.weight=st.weight+0.25*(100-st.weight); }
  else if(result==="parcial"){ st.partial++; st.weight=st.weight+0.10*(55-st.weight); }
  else { st.notHelped++; st.weight=st.weight-0.25*st.weight; }
  st.weight=Math.max(5,Math.min(95,Math.round(st.weight*10)/10));
  st.lastUsedAt=nowISO();
}
export function pickInterventionFor(state,muscle){
  const cands=INTERVENTIONS.filter(x=>x.muscle===muscle);
  if(!cands.length) return null;
  const scored=cands.map(iv=>{
    const st=state.interventionStats[iv.title];
    return {iv, s:(st&&st.weight!==undefined?st.weight:50)+Math.random()*6};
  }).sort((a,b)=>b.s-a.s);
  return scored[0].iv;
}
export function bestToolOf(state){
  let best=null,bw=-1;
  Object.entries(state.interventionStats||{}).forEach(([k,v])=>{
    const w=v.weight!==undefined?v.weight:((v.helped||0)-(v.notHelped||0))*10+50;
    if((v.helped||0)+(v.partial||0)>0 && w>bw){bw=w;best=k;}
  });
  return best?{key:best,weight:Math.round(bw)}:null;
}

