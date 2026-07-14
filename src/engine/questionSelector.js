import { NICOTINE_IDS } from "../data/catalogs.js";
import { OPTION_LABELS, QUESTION_BANK } from "../data/questionBank.js";
import { lastEventOf, substanceEvents, wakeEventOfDay } from "./calculations.js";
import { AVOID_REPEAT_LAST_N } from "./config.js";
import { getOpenDay } from "./logicalDay.js";
import { minsBetween, nowISO } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/questionSelector.js  (v2 RC2)
   Selección contextual: lugar, sustancia, estado, hora, sueño,
   día lógico y patrón actual. Sin formularios, sin repetición.
===================================================================== */
export function getQMem(state, questionId){
  let m = state.questionMemory.find(x=>x.questionId===questionId);
  if(!m){
    m={questionId, timesShown:0, skips:0, lastShownAt:null, lastTexts:[],
       lastAnswer:null, lastAnsweredAt:null, sameAnswerStreak:0};
    state.questionMemory.push(m);
  }
  return m;
}
export function questionApplies(q, ctx){
  const a=q.appliesTo||{};
  if(ctx.stateBranch){ return (a.stateBranch||[]).includes(ctx.stateBranch); }
  if(ctx.place){ return (a.place||[]).includes(ctx.place); }
  if(ctx.eventType){ return (a.eventType||[]).includes(ctx.eventType); }
  return false;
}
export function pickVariant(q, mem){
  const avoid = (mem.lastTexts||[]).slice(-AVOID_REPEAT_LAST_N);
  const fresh = q.textVariants.filter(t=>!avoid.includes(t));
  const pool = fresh.length ? fresh : q.textVariants;
  return pool[Math.floor(Math.random()*pool.length)];
}
/* Qué variables alimentan a qué mecanismos sospechados (para priorizar) */
export const MECH_VARIABLE_BOOST = {
  "rumiación":["attentionDirection","mentalIntent"],
  "anticipación":["attentionDirection","mentalIntent"],
  "simulación de futuros":["attentionDirection"],
  "búsqueda de certeza":["mentalIntent"],
  "necesidad de control":["mentalIntent","need"],
  "compulsión / obediencia":["couldWait","automaticity"],
  "consumo automático":["couldWait","automaticity","precursor"],
  "evitación":["impulse","need","precursor"],
  "intolerancia a vacío":["underneath","need"],
  "juez interno":["mentalIntent"],
  "autoexigencia":["mentalIntent"],
  "activación corporal":["body"],
  "catastrofización":["attentionDirection"],
};
export function ctxInfoOf(state){
  const hour = new Date().getHours();
  const topMechs = state.hypotheses.filter(h=>h.confidence>=25).map(h=>h.mechanism);
  const day = getOpenDay(state);
  const nicToday = substanceEvents(state, NICOTINE_IDS, day.id).length;
  const lastState = lastEventOf(state,"state");
  const dificilRecent = !!(lastState && lastState.subtype==="dificil"
    && minsBetween(lastState.createdAt, nowISO())<120);
  const wake = wakeEventOfDay(state, day.id);
  const lowEnergy = !!(wake && wake.context &&
    (wake.context.wakeEnergy==="baja"||wake.context.wakeEnergy==="agotado"));
  return { hour, topMechs, nicToday, dificilRecent, lowEnergy };
}
export function setHashKey(ctx){
  return "__set__"+(ctx.stateBranch?("state:"+ctx.stateBranch)
    :ctx.place?("place:"+ctx.place):("type:"+(ctx.eventType||"?")));
}
export function selectQuestions(state, ctx, max){
  max = max || 3;
  const now = Date.now();
  const info = ctxInfoOf(state);
  const candidates = QUESTION_BANK.filter(q=>questionApplies(q,ctx)).map(q=>{
    const mem = getQMem(state, q.id);
    let score = q.weight*10 + Math.random()*4;
    if(mem.lastShownAt && (now - new Date(mem.lastShownAt).getTime()) < 2*3600000) score -= 25;
    if(mem.skips>=3 && mem.lastShownAt && (now - new Date(mem.lastShownAt).getTime()) < 7*86400000) score -= 40;
    if(q.fixedFirst) score += 100;
    // patrón actual: si un mecanismo sospechado se alimenta de esta variable, sube
    info.topMechs.forEach(mech=>{
      if((MECH_VARIABLE_BOOST[mech]||[]).includes(q.variable)) score += 12;
    });
    // hora
    if(info.hour<12 && (q.variable==="arrival"||q.variable==="dayOutlook")) score += 8;
    if(info.hour>=19 && (q.variable==="precursor"||q.variable==="underneath")) score += 6;
    // carga de sustancias del día
    if(ctx.eventType==="substance" && info.nicToday>=6 &&
      (q.variable==="need"||q.variable==="automaticity")) score += 8;
    // estado difícil reciente
    if(info.dificilRecent && (q.variable==="body"||q.variable==="impulse")) score += 6;
    // energía baja al despertar
    if(info.lowEnergy && q.variable==="need") score += 5;
    return {q, mem, score};
  }).sort((a,b)=>b.score-a.score);
  const chosen=[]; const usedVars={};
  candidates.forEach(c=>{
    if(chosen.length>=max) return;
    if(usedVars[c.q.variable]) return;
    if(c.score < -10) return;
    usedVars[c.q.variable]=true;
    let text = pickVariant(c.q, c.mem);
    // respuesta repetida 5+: pregunta de confirmación breve, mismas opciones
    if(c.mem.sameAnswerStreak>=5 && c.mem.lastAnswer && OPTION_LABELS[c.mem.lastAnswer]){
      text = "La última vez fue "+OPTION_LABELS[c.mem.lastAnswer]+". ¿Y ahora?";
    }
    chosen.push({ id:c.q.id, variable:c.q.variable, text, options:c.q.options });
  });
  // nunca repetir exactamente el mismo trío de la sesión anterior en este contexto
  const key = setHashKey(ctx);
  const prev = state.questionMemory.find(x=>x.questionId===key);
  const hash = chosen.map(c=>c.id).sort().join("|");
  if(prev && prev.lastAnswer===hash && candidates.length>chosen.length && chosen.length>1){
    for(let i=chosen.length-1;i>=0;i--){
      const alt = candidates.find(c=>!chosen.some(ch=>ch.id===c.q.id)
        && !chosen.some((ch,idx)=>idx!==i && ch.variable===c.q.variable) && c.score>-10);
      if(alt && !QUESTION_BANK.find(qq=>qq.id===chosen[i].id).fixedFirst){
        chosen[i]={ id:alt.q.id, variable:alt.q.variable,
          text:pickVariant(alt.q, alt.mem), options:alt.q.options };
        break;
      }
    }
  }
  return chosen;
}
export function storeQuestionSetHash(state, ctxKey, ids){
  const m=getQMem(state, "__set__"+ctxKey);
  m.lastAnswer=(ids||[]).slice().sort().join("|");
  m.lastAnsweredAt=nowISO();
}
export function markShown(state, qId, text){
  const m=getQMem(state,qId);
  m.timesShown++; m.lastShownAt=nowISO();
  m.lastTexts=(m.lastTexts||[]).concat([text]).slice(-AVOID_REPEAT_LAST_N);
}
export function markAnswered(state, qId, value){
  const m=getQMem(state,qId);
  if(m.lastAnswer===value){ m.sameAnswerStreak=(m.sameAnswerStreak||0)+1; }
  else { m.sameAnswerStreak=0; }
  m.lastAnswer=value; m.lastAnsweredAt=nowISO(); m.skips=0;
}
export function markSkipped(state, qId){
  const m=getQMem(state,qId);
  m.skips=(m.skips||0)+1;
}
export function mostSkippedVariable(state){
  let best=null, bn=0;
  state.questionMemory.forEach(m=>{
    if(String(m.questionId).indexOf("__set__")===0) return;
    if((m.skips||0)>bn){
      const q=QUESTION_BANK.find(x=>x.id===m.questionId);
      if(q){ best=q.variable; bn=m.skips; }
    }
  });
  return bn>=3 ? {variable:best, skips:bn} : null;
}

