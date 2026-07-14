/* =====================================================================
   MÓDULO: data/questionBank.js
   Cada pregunta alimenta UNA variable latente. textVariants rotan.
===================================================================== */
export const QUESTION_BANK = [
  // ---- Estado: DIFÍCIL ----
  { id:"st_dif_peso", variable:"emotion", weight:3, fixedFirst:true,
    appliesTo:{ stateBranch:["dificil"] },
    textVariants:["¿Qué pesa más?","¿Qué emoción domina?","¿Qué está más presente ahora?"],
    options:[["estres","Estrés"],["tristeza","Tristeza"],["miedo","Miedo"],["enojo","Enojo"],
      ["vacio","Vacío"],["culpa","Culpa"],["impotencia","Impotencia"],
      ["incertidumbre","Incertidumbre"],["soledad","Soledad"],["celos","Celos"],["insuficiencia","Insuficiencia"]] },
  { id:"st_dif_atencion", variable:"attentionDirection", weight:2,
    appliesTo:{ stateBranch:["dificil"], eventType:["sos","resolver"] },
    textVariants:["¿Dónde está tu atención?","¿Esto está pasando ahora o está en tu mente?",
      "¿Tu cabeza está en presente, pasado o película?","¿Estás observando realidad o simulando?"],
    options:[["presente_real","Presente real"],["futuro_real","Futuro real"],
      ["futuro_imaginario","Futuro imaginario"],["pasado","Pasado"],
      ["fantasia","Fantasía"],["rumiacion","Rumiación"]] },
  { id:"st_dif_cabeza", variable:"mentalIntent", weight:2,
    appliesTo:{ stateBranch:["dificil"] },
    textVariants:["¿Qué intenta hacer tu cabeza?","¿Qué está buscando tu mente?","¿Cuál es la misión de tu cabeza ahorita?"],
    options:[["resolver","Resolver"],["comprobar","Comprobar"],["anticipar","Anticipar"],
      ["controlar","Controlar"],["cerrar_historia","Cerrar historia"],["evitar_sentir","Evitar sentir"],
      ["castigarte","Castigarte"],["prepararte","Prepararte"]] },
  { id:"st_dif_cuerpo", variable:"body", weight:1,
    appliesTo:{ stateBranch:["dificil"] },
    textVariants:["¿Qué siente el cuerpo?","¿Dónde vive esto en tu cuerpo?"],
    options:[["pecho","Pecho"],["garganta","Garganta"],["mandibula","Mandíbula"],["estomago","Estómago"],
      ["cuello","Cuello"],["cabeza","Cabeza"],["tension","Tensión general"],["cansancio","Cansancio"]] },
  { id:"st_dif_impulso", variable:"impulse", weight:1,
    appliesTo:{ stateBranch:["dificil"] },
    textVariants:["¿Qué impulso apareció?","¿Qué te pide el cuerpo hacer?"],
    options:[["fumar","Fumar"],["revisar","Revisar"],["pensar_mas","Pensar más"],["preguntar","Preguntar"],
      ["comer","Comer"],["tomar","Tomar"],["aislarme","Aislarme"],["dormir","Dormir"],["nada","Nada todavía"]] },
  // ---- Estado: BIEN ----
  { id:"st_bien_tipo", variable:"emotion", weight:3, fixedFirst:true,
    appliesTo:{ stateBranch:["bien"] },
    textVariants:["¿Qué tipo de bien es?","¿Cómo se llama este bien?"],
    options:[["paz","Paz"],["bienestar","Bienestar"],["satisfaccion","Satisfacción"],
      ["motivacion","Motivación"],["gratitud","Gratitud"],["conexion","Conexión"],["orgullo","Orgullo"]] },
  { id:"st_bien_favorecio", variable:"support", weight:2,
    appliesTo:{ stateBranch:["bien"] },
    textVariants:["¿Qué lo favoreció?","¿De dónde viene?"],
    options:[["descanso","Descanso"],["ejercicio","Ejercicio"],["conversacion","Conversación"],["mika","Mika"],
      ["logro","Logro"],["orden","Orden"],["naturaleza","Naturaleza"],["compania","Compañía"],
      ["sin_problema","Ausencia de problema"],["no_se","No sé"]] },
  { id:"st_bien_conservar", variable:"keep", weight:1,
    appliesTo:{ stateBranch:["bien"] },
    textVariants:["¿Qué quieres conservar?","Si guardas una cosa de este momento, ¿cuál?"],
    options:[["calma","Calma"],["energia","Energía"],["enfoque","Enfoque"],["compania","Compañía"],
      ["claridad","Claridad"],["presencia","Presencia"]] },
  // ---- Estado: NEUTRAL ----
  { id:"st_neu_tipo", variable:"emotion", weight:3, fixedFirst:true,
    appliesTo:{ stateBranch:["neutral"] },
    textVariants:["¿Cómo se siente este neutral?","¿Qué tipo de neutral es?"],
    options:[["estable","Estable"],["automatico","Automático"],["cansado","Cansado"],
      ["aburrido","Aburrido"],["apagado","Apagado"],["observando","Observando"]] },
  { id:"st_neu_debajo", variable:"underneath", weight:2,
    appliesTo:{ stateBranch:["neutral"] },
    textVariants:["¿Hay algo debajo?","Si escarbas un poco, ¿qué hay?"],
    options:[["nada","Nada claro"],["cansancio","Cansancio"],["pendiente","Pendiente leve"],
      ["tranquilidad_dificil","Tranquilidad difícil"],["falta_estimulo","Falta de estímulo"],["no_se","No sé"]] },
  // ---- Sustancias (moderado ocasional) ----
  { id:"sub_need", variable:"need", weight:3,
    appliesTo:{ eventType:["substance"] },
    textVariants:["¿Qué buscabas?","¿Qué necesitabas realmente?","¿Qué esperabas que cambiara?",
      "¿Qué querías no sentir?","¿Qué te faltaba en ese momento?"],
    options:[["pausa","Pausa"],["alivio","Alivio"],["recompensa","Recompensa"],["control","Control"],
      ["desconexion","Desconexión"],["compania","Compañía"],["activarte","Activarte"],["no_se","No sé"]] },
  { id:"sub_auto", variable:"automaticity", weight:2,
    appliesTo:{ eventType:["substance"] },
    textVariants:["¿Fue automático o decidido?","¿Lo notaste antes de hacerlo?"],
    options:[["automatico","Automático"],["lo_note","Lo noté antes"],["decidido","Lo decidí"]] },
  { id:"sub_esperar", variable:"couldWait", weight:1,
    appliesTo:{ eventType:["substance"] },
    textVariants:["¿Podías esperar?","¿Había espacio para esperar 2 minutos?"],
    options:[["si","Sí"],["no","No"],["no_intente","No lo intenté"]] },
  { id:"sub_antes", variable:"precursor", weight:2,
    appliesTo:{ eventType:["substance"] },
    textVariants:["¿Qué había justo antes?","¿Qué estaba pasando 10 minutos antes?"],
    options:[["estres","Estrés"],["cansancio","Cansancio"],["aburrimiento","Aburrimiento"],
      ["rumiacion","Rumiación"],["hambre","Hambre"],["soledad","Soledad"],["trabajo","Trabajo"],["nada","Nada claro"]] },
  // ---- Lugares ----
  { id:"pl_cons_llegas", variable:"arrival", weight:2,
    appliesTo:{ place:["Consultorio","Quirófano"] },
    textVariants:["¿Cómo llegas?","¿Cómo vienes hoy?"],
    options:[["bien","Bien"],["cansado","Cansado"],["estresado","Estresado"],["prisa","Con prisa"],
      ["tranquilo","Tranquilo"],["saturado","Saturado"]] },
  { id:"pl_cons_dia", variable:"dayOutlook", weight:1,
    appliesTo:{ place:["Consultorio","Quirófano"] },
    textVariants:["¿Cómo pinta el día?","¿Qué tanto trae el día?"],
    options:[["lleno","Lleno"],["normal","Normal"],["vacio","Vacío"],["impredecible","Impredecible"],
      ["pesado","Pesado"],["tranquilo","Tranquilo"]] },
  { id:"pl_cons_genera", variable:"placeEffect", weight:1,
    appliesTo:{ place:["Consultorio","Quirófano"] },
    textVariants:["¿Qué genera este lugar hoy?"],
    options:[["enfoque","Enfoque"],["presion","Presión"],["pausa","Pausa"],["cansancio","Cansancio"],
      ["urgencia","Urgencia"],["ganas_fumar","Ganas de fumar"]] },
  { id:"pl_casa", variable:"placeEffect", weight:2,
    appliesTo:{ place:["Casa"] },
    textVariants:["¿Cómo se siente casa hoy?"],
    options:[["refugio","Refugio"],["silencio_dificil","Silencio difícil"],["descanso","Descanso"],
      ["aburrimiento","Aburrimiento"],["soledad","Soledad"],["orden","Orden"]] },
  { id:"pl_coche_tipo", variable:"tripType", weight:2,
    appliesTo:{ place:["Coche"] },
    textVariants:["¿Qué tipo de trayecto es?"],
    options:[["saliendo","Saliendo del trabajo"],["a_consulta","Camino a consulta"],["trafico","Tráfico"],
      ["regreso","Regreso a casa"],["transicion","Transición"],["sin_prisa","Sin prisa"]] },
  { id:"pl_coche_mente", variable:"attentionDirection", weight:1,
    appliesTo:{ place:["Coche"] },
    textVariants:["¿Qué hace tu mente aquí?"],
    options:[["descarga","Descarga"],["planea","Planea"],["rumiacion","Rumia"],["evade","Evade"],
      ["se_calma","Se calma"],["busca_fumar","Busca fumar"]] },
  { id:"st_neu_atencion", variable:"attentionDirection", weight:1,
    appliesTo:{ stateBranch:["neutral"] },
    textVariants:["¿Dónde anda tu atención?","¿Tu cabeza está aquí o en otro lado?"],
    options:[["presente_real","Presente real"],["futuro_real","Futuro real"],
      ["futuro_imaginario","Futuro imaginario"],["pasado","Pasado"],
      ["fantasia","Fantasía"],["rumiacion","Rumiación"]] },
  { id:"sub_body", variable:"body", weight:1,
    appliesTo:{ eventType:["substance"] },
    textVariants:["¿Qué sentía el cuerpo justo antes?","¿Dónde estaba la tensión antes de esto?"],
    options:[["pecho","Pecho"],["garganta","Garganta"],["mandibula","Mandíbula"],["estomago","Estómago"],
      ["cuello","Cuello"],["tension","Tensión general"],["cansancio","Cansancio"],["sin_molestia","Sin molestia"]] },
];
export const OPTION_LABELS = {};
QUESTION_BANK.forEach(q => q.options.forEach(([v,l]) => { OPTION_LABELS[v]=l; }));

/* Inferencia de mecanismos a partir de respuestas (variable:valor -> mecanismo) */
export const MECHANISM_MAP = {
  "attentionDirection:futuro_imaginario":"simulación de futuros",
  "attentionDirection:rumiacion":"rumiación",
  "attentionDirection:pasado":"rumiación",
  "attentionDirection:fantasia":"fantasía compensatoria",
  "attentionDirection:busca_fumar":"evitación",
  "mentalIntent:comprobar":"comprobación",
  "mentalIntent:anticipar":"anticipación",
  "mentalIntent:controlar":"necesidad de control",
  "mentalIntent:castigarte":"juez interno",
  "mentalIntent:evitar_sentir":"evitación",
  "mentalIntent:cerrar_historia":"rumiación",
  "mentalIntent:prepararte":"anticipación",
  "precursor:rumiacion":"rumiación",
  "emotion:incertidumbre":"búsqueda de certeza",
  "emotion:culpa":"culpa funcional",
};
export function inferFromAnswers(answers){
  const mechanisms=[]; let need=null, attention=null;
  Object.entries(answers||{}).forEach(([variable,value])=>{
    const m = MECHANISM_MAP[variable+":"+value];
    if(m && !mechanisms.includes(m)) mechanisms.push(m);
    if(variable==="need") need=value;
    if(variable==="attentionDirection") attention=value;
  });
  const out={};
  if(mechanisms.length) out.mechanisms=mechanisms;
  if(need) out.need=need;
  if(attention) out.attention=attention;
  return out;
}

