import { nowISO } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/latentVars.js  (RC2)
   Variables latentes internas. No se preguntan: se infieren y decaen.
   El Director las usa; el usuario sólo las ve en Claridad → ver detalle.
===================================================================== */
export const LATENT_DEFS = {
  presence:"presencia", rumination:"rumiación", uncertainty:"incertidumbre",
  emptiness:"vacío", avoidance:"evitación", selfDemand:"autoexigencia",
  judge:"juez interno", adult:"adulto", child:"niño",
  bodyTension:"tensión corporal", threat:"sensación de amenaza",
  control:"necesidad de control", connection:"conexión",
  energy:"energía", emotionalTolerance:"tolerancia emocional",
};
export function ensureLatent(state,k){
  if(!state.latent) state.latent={};
  if(!state.latent[k]) state.latent[k]={value:50, updatedAt:nowISO(), evidence:0};
  return state.latent[k];
}
export function latentDecayed(l){
  const h=(Date.now()-new Date(l.updatedAt).getTime())/3600000;
  return 50 + (l.value-50)*Math.pow(0.5, h/36);
}
export function bumpLatent(state,k,delta){
  const l=ensureLatent(state,k);
  const v=latentDecayed(l);
  l.value=Math.max(0,Math.min(100,Math.round((v+delta)*10)/10));
  l.updatedAt=nowISO(); l.evidence++;
}
export const LATENT_RULES = {
  attention:{ presente_real:[["presence",8]],
    futuro_imaginario:[["presence",-6],["uncertainty",5],["threat",4]],
    rumiacion:[["presence",-6],["rumination",8]],
    pasado:[["presence",-5],["rumination",6]],
    fantasia:[["presence",-5],["avoidance",4]] },
  mentalIntent:{ comprobar:[["uncertainty",7],["control",5]],
    anticipar:[["threat",6],["uncertainty",5]], prepararte:[["threat",5],["uncertainty",4]],
    controlar:[["control",8]], castigarte:[["judge",9],["selfDemand",6],["child",4]],
    evitar_sentir:[["avoidance",8],["emotionalTolerance",-5]],
    resolver:[["adult",4]], cerrar_historia:[["rumination",5]] },
  emotion:{ incertidumbre:[["uncertainty",8]], vacio:[["emptiness",9]],
    soledad:[["connection",-7],["emptiness",4]], miedo:[["threat",7]],
    culpa:[["judge",6]], impotencia:[["control",-6],["threat",4]],
    estres:[["bodyTension",5],["threat",4]], celos:[["threat",5],["connection",-4]],
    insuficiencia:[["selfDemand",8],["judge",5]],
    paz:[["presence",6],["threat",-5],["emotionalTolerance",3]],
    bienestar:[["presence",5],["threat",-4]], conexion:[["connection",8]],
    motivacion:[["energy",6]], gratitud:[["connection",5]],
    satisfaccion:[["adult",3],["energy",3]], orgullo:[["adult",4]] },
  body:{ pecho:[["bodyTension",8]], garganta:[["bodyTension",7]],
    mandibula:[["bodyTension",8]], estomago:[["bodyTension",7]],
    cuello:[["bodyTension",8]], tension:[["bodyTension",9]],
    cansancio:[["energy",-6]], cabeza:[["bodyTension",5]],
    relajado:[["bodyTension",-6]], tenso:[["bodyTension",8]],
    pesado:[["energy",-4]], con_energia:[["energy",6]], hambre:[["energy",-3]] },
  need:{ control:[["control",5]], desconexion:[["avoidance",6]],
    escape:[["avoidance",7]], pausa:[["energy",-3]] },
  couldWait:{ si:[["emotionalTolerance",7],["adult",4]],
    no:[["emotionalTolerance",-5]], no_intente:[["emotionalTolerance",-3]] },
  automaticity:{ automatico:[["adult",-3]], decidido:[["adult",4]], lo_note:[["presence",4]] },
  underneath:{ falta_estimulo:[["emptiness",5]], cansancio:[["energy",-5]] },
  wakeEnergy:{ alta:[["energy",10]], media:[["energy",3]],
    baja:[["energy",-8]], agotado:[["energy",-12]] },
  sleepQuality:{ mal:[["energy",-6]], bebe:[["energy",6]] },
};
export const TRAINING_LATENT = {
  incertidumbre:["uncertainty",-8], "rumiación":["rumination",-8],
  presencia:["presence",8], "vacío":["emptiness",-8], soledad:["connection",6],
  impulso:["emotionalTolerance",7], "regulación":["bodyTension",-7],
  "construcción":["adult",6],
};
export function updateLatentOnEvent(state, ev){
  const ctx = Object.assign({}, ev.context,
    ev.inferred && ev.inferred.attention ? {attention:ev.inferred.attention} : null);
  Object.entries(ctx||{}).forEach(([variable,value])=>{
    const rules = LATENT_RULES[variable];
    if(rules && rules[value]) rules[value].forEach(([k,d])=>bumpLatent(state,k,d));
  });
  if(ev.eventType==="exercise"||ev.eventType==="microAction"){
    bumpLatent(state,"energy",6); bumpLatent(state,"bodyTension",-5); bumpLatent(state,"adult",3);
  }
  if(ev.eventType==="sos"){ bumpLatent(state,"adult",4);
    if(ev.subtype==="rumiacion") bumpLatent(state,"rumination",5); }
  if(ev.eventType==="resolver"){ bumpLatent(state,"adult",6); bumpLatent(state,"judge",-3); }
  if(ev.eventType==="state"&&ev.subtype==="bien"){ bumpLatent(state,"threat",-4); }
  if(ev.eventType==="training"&&ev.context&&ev.context.helped==="si"){
    const r=TRAINING_LATENT[ev.subtype]; if(r) bumpLatent(state,r[0],r[1]);
  }
}
export const COMPOSITE_DEFS=[
  ["cargaMental","carga mental",(v)=>v.rumination*0.35+v.uncertainty*0.25+v.threat*0.2+v.bodyTension*0.2],
  ["tensionFisica","tensión física",(v)=>v.bodyTension],
  ["autocritica","autocrítica",(v)=>(v.judge+v.selfDemand)/2],
  ["flexibilidad","flexibilidad",(v)=>100-(v.control*0.4+v.rumination*0.3+v.uncertainty*0.3)],
  ["energiaC","energía",(v)=>v.energy],
  ["claridad","claridad",(v)=>v.presence*0.5+v.adult*0.3+(100-v.rumination)*0.2],
  ["impulsividad","impulso",(v)=>100-(v.emotionalTolerance*0.7+v.adult*0.3)],
  ["inercia","inercia",(v)=>100-(v.energy*0.7+v.presence*0.3)],
  ["esperanza","esperanza",(v)=>(100-v.threat)*0.4+v.connection*0.3+v.adult*0.3],
  ["controlPercibido","control percibido",(v)=>v.adult*0.5+(100-v.uncertainty)*0.3+v.energy*0.2],
];
export function compositeSnapshot(state){
  const withEv=Object.values(state.latent||{}).filter(l=>l.evidence>0).length;
  if(withEv<3) return []; // honestidad: sin señal primaria suficiente, no hay compuestas
  const v={};
  Object.keys(LATENT_DEFS).forEach(k=>{
    v[k]=state.latent&&state.latent[k]?latentDecayed(state.latent[k]):50;
  });
  return COMPOSITE_DEFS.map(([key,label,fn])=>({key,label,
    value:Math.max(0,Math.min(100,Math.round(fn(v))))}))
    .sort((a,b)=>Math.abs(b.value-50)-Math.abs(a.value-50));
}
export function latentSnapshot(state){
  return Object.entries(state.latent||{}).map(([k,l])=>({
    key:k, label:LATENT_DEFS[k]||k, value:Math.round(latentDecayed(l)), evidence:l.evidence
  })).filter(x=>x.evidence>0)
    .sort((a,b)=>Math.abs(b.value-50)-Math.abs(a.value-50));
}

