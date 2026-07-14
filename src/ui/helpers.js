import { ALCOHOL_TYPES, EXERCISES, MICROACTIONS, STATE_BRANCHES, SUBSTANCES } from "../data/catalogs.js";
import { OPTION_LABELS, QUESTION_BANK } from "../data/questionBank.js";
import { markAnswered, markShown, markSkipped, storeQuestionSetHash } from "../engine/questionSelector.js";
/* =====================================================================
   MÓDULO: ui/helpers.js
===================================================================== */
export function cloneState(s){ return JSON.parse(JSON.stringify(s)); }
export function copyText(text, toast){
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(()=>toast("Copiado"))
      .catch(()=>toast("No se pudo copiar"));
  } else {
    const ta=document.createElement("textarea");
    ta.value=text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand("copy"); toast("Copiado"); }
    catch(e){ toast("No se pudo copiar"); }
    document.body.removeChild(ta);
  }
}
export function markRecords(n, records, ctxKey){
  const ids=[];
  (records||[]).forEach(r=>{
    if(!QUESTION_BANK.some(q=>q.id===r.id)) return;
    ids.push(r.id);
    markShown(n, r.id, r.text);
    if(r.value==null) markSkipped(n, r.id);
    else markAnswered(n, r.id, r.value);
  });
  if(ctxKey && ids.length) storeQuestionSetHash(n, ctxKey, ids);
}
export function eventIcon(e){
  if(e.eventType==="substance"){ const s=SUBSTANCES.find(x=>x.id===e.subtype); return s?s.emoji:"•"; }
  const map={ state:"💭", place:"📍", body:"🫀", sleep:"🌙", nap:"😴", wake:"☀️",
    exercise:"🏃", microAction:"⚡", work:"💼", leisure:"🎧", sos:"🆘",
    resolver:"🧭", training:"🏋️", carta:"✉️" };
  return map[e.eventType]||"•";
}
export function eventLabel(e){
  if(e.eventType==="substance"){
    const s=SUBSTANCES.find(x=>x.id===e.subtype);
    let l=s?s.label:e.subtype;
    if(e.subtype==="alcohol" && e.value && e.value.drink){
      const t=ALCOHOL_TYPES.find(x=>x.id===e.value.drink);
      l+=" · "+(t?t.label:e.value.drink);
    }
    return l;
  }
  if(e.eventType==="state"){
    const b=STATE_BRANCHES.find(x=>x.id===e.subtype);
    const emo=e.context&&e.context.emotion?(" · "+(OPTION_LABELS[e.context.emotion]||"")):"";
    return "Estado: "+(b?b.label:e.subtype)+emo;
  }
  if(e.eventType==="place") return "Lugar: "+e.subtype;
  if(e.eventType==="exercise"){
    const x=EXERCISES.find(y=>y.id===e.subtype);
    return "Ejercicio: "+(x?x.label:e.subtype)+(e.value&&e.value.min?(" "+e.value.min+" min"):"");
  }
  if(e.eventType==="microAction"){
    const m=MICROACTIONS.find(y=>y.id===e.subtype);
    return "Micro: "+(m?m.label:e.subtype);
  }
  if(e.eventType==="work") return e.value==="start"?"Trabajo: inicio":"Trabajo: pausa";
  if(e.eventType==="leisure") return e.value==="start"?"Ocio: inicio":"Ocio: pausa";
  if(e.eventType==="sleep") return e.subtype==="mainSleep"?"Dormir (principal)":"Dormir";
  if(e.eventType==="nap") return "Siesta: inicio";
  if(e.eventType==="wake") return e.subtype==="nap"?"Despertar de siesta":"Despertar";
  if(e.eventType==="sos") return "SOS";
  if(e.eventType==="resolver") return "Resolver";
  if(e.eventType==="training") return "Entrenar: "+e.subtype;
  if(e.eventType==="carta") return e.subtype==="daily"?"Carta diaria":"Carta";
  return e.eventType;
}

