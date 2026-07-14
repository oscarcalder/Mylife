import { CONF_PREFIX, STATUS_LABEL } from "./director.js";
import { buildInsights } from "./insightsEngine.js";
import { fmtDate, nowISO, timeAgo } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/coach.js  (v3 RC3)
   El Coach adapta tono, longitud y tecnicidad, NUNCA hechos, cifras,
   confianza ni conclusiones. Y sabe callarse.
===================================================================== */
export function coachHomeLine(state){
  const ins=buildInsights(state);
  if(ins.primary){
    const h=ins.primary.h;
    return { text: CONF_PREFIX[h.status] + h.title + ".", hypId:h.id, hypKey:h.key };
  }
  if(ins.victory) return { text: ins.victory.text, hypId:null, hypKey:null };
  if(ins.silenced) return { text:"🌿 Hoy no veo ningún patrón importante. Sigue viviendo.",
    hypId:null, hypKey:null, silence:true };
  return { text:"Sigo observando. Todavía no tengo suficiente evidencia.", hypId:null, hypKey:null };
}
export const WHY_BY_STATUS={
  initial:"Lo digo con cautela: apenas hay señales, y podría estar equivocado.",
  emerging:"Lo digo porque la señal se repite más de lo que esperaría por azar.",
  probable:"Lo digo porque el patrón se sostiene aunque cambie el contexto.",
  solid:"Lo digo porque la evidencia es consistente y las excepciones son pocas.",
};
export const WHY_SHORT={initial:"Cautela: pocas señales.",emerging:"La señal se repite.",
  probable:"El patrón se sostiene.",solid:"Evidencia consistente."};
export function coachLayers(h, state){
  const evCount=Math.max(1,Math.round((h.evidenceEventIds||[]).length/2));
  const evs=(h.evidenceEventIds||[]).map(id=>state.events.find(e=>e.id===id)).filter(Boolean);
  const firstEv=evs[0], lastEv=evs[evs.length-1];
  const contra=h.contradictions||0;
  const pending=state.experiments.find(x=>x.hypKey===h.key&&x.status==="activo")||null;
  const lastDone=state.experiments.slice().reverse().find(x=>x.hypKey===h.key
    &&["compatible","parcial","contradicho","inconcluso"].includes(x.status))||null;
  return {
    observation: CONF_PREFIX[h.status] + h.title + ".",
    why: "Por qué lo creo: el mecanismo que mejor explica la secuencia es "
      + h.mechanism + ". " + WHY_BY_STATUS[h.status]
      + " Esto es interpretación, no un hecho sobre ti.",
    evidence: "Evidencia: "+evCount+" ocasiones"
      + (firstEv? ", desde "+fmtDate(firstEv.createdAt) : "")
      + (lastEv? ", la última "+timeAgo(lastEv.createdAt) : "")
      + (contra? ". Excepciones en contra: "+contra : ". Sin excepciones registradas")
      + ". Confianza: "+STATUS_LABEL[h.status]+" ("+h.confidence+"%).",
    action: pending
      ? "Experimento activo ("+(pending.selfReport?"auto-reporte":"medido")+"): "+pending.text
      : (h.suggestedExperiment || "Por ahora, sólo observa cuándo vuelve a aparecer."),
    pendingExperiment: pending,
    lastResult: lastDone ? lastDone.status : null,
  };
}
/* ---------- estilo: basal configurable + aprendizaje con señal ocasional ---------- */
export function styleOf(state){
  const cs=state.coachStyle||{basal:"adaptativo",learned:{}};
  if(cs.basal&&cs.basal!=="adaptativo") return cs.basal;
  const L=cs.learned||{};
  const best=Object.entries({directo:L.directo||0,amable:L.amable||0,tecnico:L.tecnico||0})
    .sort((a,b)=>b[1]-a[1])[0];
  return best[1]>0?best[0]:"amable";
}
export function styleLayers(layers, h, style){
  const out=Object.assign({},layers);
  if(style==="directo"){
    out.why="Por qué: mecanismo "+h.mechanism+". "+WHY_SHORT[h.status]
      +" Interpretación, no hecho.";
    out.action=(out.action.indexOf("Experimento activo")===0?out.action:"Hazlo: "+out.action);
  } else if(style==="tecnico"){
    out.observation=layers.observation+" [confianza "+h.confidence+"%, mecanismo: "+h.mechanism+"]";
  } else if(style==="amable"){
    out.action=(out.action.indexOf("Experimento activo")===0?out.action:"Sin prisa: "+out.action);
    out.why=layers.why+" Vamos con calma.";
  }
  return out;
}
export function shouldAskStyle(state, fromSOSActivation){
  const cs=state.coachStyle||{};
  if(cs.basal!=="adaptativo") return false;
  if(fromSOSActivation) return false; // nunca en pico de activación
  const L=cs.learned||{};
  const total=(L.directo||0)+(L.amable||0)+(L.tecnico||0);
  if(total>=3) return false; // ya hay certeza razonable
  if(cs.lastAskedAt&&(Date.now()-new Date(cs.lastAskedAt).getTime())<7*86400000) return false;
  return true;
}
export function recordStyleAnswer(state, v){
  if(!state.coachStyle) state.coachStyle={basal:"adaptativo",learned:{directo:0,amable:0,tecnico:0},lastAskedAt:null};
  state.coachStyle.lastAskedAt=nowISO();
  if(v&&v!=="ok"){
    state.coachStyle.learned[v]=(state.coachStyle.learned[v]||0)+1;
  }
}

