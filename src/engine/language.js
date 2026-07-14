/* =====================================================================
   MÓDULO: engine/language.js (Addendum VII)
   Palabras vetadas en la voz de la app y niveles epistémicos separados.
===================================================================== */
export const FORBIDDEN=["recaída","recaida","fracaso","fracasaste","mal día","mal dia",
  "perdiste","deberías","deberias","otra vez","no pudiste","adicción","adiccion",
  "eres ansioso","estás mal","estas mal"];
export function violatesLanguage(text){
  const t=(text||"").toLowerCase();
  return FORBIDDEN.filter(w=>t.includes(w));
}
export function epistemicBlock(hecho,inferencia,hipotesis,experimento){
  const out=[];
  if(hecho) out.push({level:"Hecho",text:hecho});
  if(inferencia) out.push({level:"Inferencia",text:inferencia});
  if(hipotesis) out.push({level:"Hipótesis",text:hipotesis});
  if(experimento) out.push({level:"Experimento",text:experimento});
  return out;
}
