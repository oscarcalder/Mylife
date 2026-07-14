import { nowISO, uid } from "../utils/time.js";
import { addEvent } from "./events.js";
/* =====================================================================
   MÓDULO: engine/clinicalRouter.js (Addendum III, IV y X)
   Cada mecanismo tiene discriminación, ruta, conclusión, acción adulta
   y evaluación. Nada de cuestionario único con frases genéricas.
   Lenguaje: separar Hecho / Inferencia; jamás "todo está bien".
===================================================================== */
export function selectInterventionRoute(ctx){
  const c=ctx||{};
  if((c.activationLevel||0)>=8) return "activacion_regular";
  if(c.realityActionability==="accionable") return "accion_adulta";
  if(c.mechanism==="rumiacion"){
    if(c.noNewData) return "stop_rumination_loop";
    return "rumiacion";
  }
  if(c.mechanism==="anticipacion"||c.attentionDirection==="futuro_imaginario") return "anticipatoria";
  if(c.mechanism==="incertidumbre")
    return c.infoAvailable===false?"incertidumbre_sin_info":"incertidumbre_info";
  if(c.impulseType) return "impulso_"+c.impulseType;
  if(c.dominantEmotion==="angustia"){
    if(c.bodyState==="activado") return "angustia_corporal";
    if(c.realityActionability==="hecho_real") return "angustia_hecho_real";
    return "angustia_difusa";
  }
  if(c.dominantEmotion==="tristeza") return "tristeza";
  if(c.dominantEmotion==="vacio") return "vacio";
  if(c.dominantEmotion==="soledad") return "soledad";
  if(c.dominantEmotion==="insuficiencia"||c.mechanism==="juez") return "insuficiencia_juez";
  if(c.dominantEmotion==="celos") return "celos";
  if(c.dominantEmotion==="bien") return "momento_bueno";
  return "angustia_difusa";
}

// Discriminador de entrada del SOS (Addendum §12)
export const SOS_DISCRIMINATOR={
  q:"¿Qué predomina ahora?",
  options:[
    ["corporal","🫀 Opresión o activación corporal"],
    ["difusa","🌫️ Sensación difusa sin pensamiento claro"],
    ["pelicula","🎞️ Película mental concreta"],
    ["dolor","💔 Dolor emocional identificable"],
    ["urgencia","⚡ Urgencia de hacer algo"]]};
export const SOS_SECOND={
  pelicula:{q:"Esa película, ¿sobre qué corre?",options:[
    ["pasado","🔁 Algo que ya pasó, en repetición"],
    ["futuro","🔮 Algo que aún no ocurre"],
    ["certeza","🌫️ Necesito saber algo ya"],
    ["hecho","📌 Un hecho real que me preocupa"]]},
  dolor:{q:"¿Cuál se parece más?",options:[
    ["tristeza","🌧️ Tristeza"],["vacio","🕳️ Vacío"],["soledad","🌘 Soledad"],
    ["insuficiencia","⚖️ No soy suficiente"],["celos","🪞 Celos / comparación"]]},
  urgencia:{q:"Ese impulso, ¿a qué se parece?",options:[
    ["fisico","🫀 Lo pide el cuerpo"],["emocional","❤️ Promete calmar algo"],
    ["automatico","🔁 Ya estaba ocurriendo solo"],["recompensa","🎁 Es un premio"],
    ["evasion","🚪 Corta algo que no quiero sentir"]]}};
export function routeFromDiscriminator(first,second){
  if(first==="corporal") return "angustia_corporal";
  if(first==="difusa") return "angustia_difusa";
  if(first==="pelicula")
    return second==="pasado"?"rumiacion":second==="futuro"?"anticipatoria"
      :second==="certeza"?"incertidumbre_info":"angustia_hecho_real";
  if(first==="dolor")
    return second==="tristeza"?"tristeza":second==="vacio"?"vacio"
      :second==="soledad"?"soledad":second==="celos"?"celos":"insuficiencia_juez";
  if(first==="urgencia") return "impulso_"+(second||"fisico");
  return "angustia_difusa";
}

const INT=[["1","1"],["3","3"],["5","5"],["7","7"],["9","9"],["10","10"]];
export const ROUTES={
activacion_regular:{emoji:"🫀",title:"Regular primero",
 steps:[
  {v:"intensity",q:"¿Qué tan fuerte está la activación (0-10)?",options:INT},
  {v:"accion",q:"Elige UNA acción corporal ahora",options:[
    ["caminar","🚶 Caminar 2 minutos"],["soltar","💆 Soltar mandíbula y hombros"],
    ["agua","💧 Beber agua despacio"],["espacio","🚪 Cambiar de espacio"],
    ["apoyo","🪑 Sentarte con la espalda apoyada"]]}],
 conclude:(a)=>({hecho:"Activación reportada: "+(a.intensity||"?")+"/10.",
  inferencia:"Con activación alta, primero cuerpo; el análisis después no miente tanto.",
  lines:["Regula 2-3 minutos y vuelve. La pregunta correcta llega mejor con el cuerpo un punto más abajo."],
  adult:[["reevaluar","Reevaluar en 3 minutos"]]})},
angustia_corporal:{emoji:"🫀",title:"Angustia corporal",
 steps:[
  {v:"donde",q:"¿Dónde vive ahora?",options:[["pecho","🫁 Pecho"],["garganta","🗣️ Garganta"],
    ["estomago","🌀 Estómago"],["mandibula","🦷 Mandíbula"],["cuello","💆 Cuello"],["difuso","🌫️ Difuso"]]},
  {v:"intensity",q:"Intensidad (0-10)",options:INT},
  {v:"curva",q:"¿Está creciendo, estable o bajando?",options:[
    ["creciendo","📈 Creciendo"],["estable","➖ Estable"],["bajando","📉 Bajando"]]},
  {v:"peligro",q:"En este minuto, ¿hay un peligro real delante de ti, o es activación?",options:[
    ["real","⚠️ Hay un problema real ahora"],["activacion","🫀 Es activación del cuerpo"]]},
  {v:"accion",q:"Acción corporal para crear margen (no para prometer calma)",options:[
    ["caminar","🚶 Caminar"],["soltar","💆 Soltar mandíbula/hombros"],["agua","💧 Agua"],
    ["espacio","🚪 Cambiar de espacio"],["apoyo","🪑 Sentarte con apoyo"],
    ["observar","👁️ Observar la curva 90 segundos"],["ayuda","🤝 Pedir ayuda con el problema real"]]}],
 conclude:(a)=>({hecho:"Sensación en "+(a.donde||"el cuerpo")+", "+(a.intensity||"?")+"/10, "+(a.curva||"?")+".",
  inferencia:a.peligro==="real"?"Hay un hecho real: la activación es señal, no el problema completo."
    :"La sensación es intensa; eso no demuestra que el escenario mental sea cierto.",
  lines:["El objetivo fue crear margen, no prometerte tranquilidad."],
  adult:a.peligro==="real"?[["resolver","Pasar a Resolver con el hecho real"]]
    :[["reevaluar","Reevaluar la curva en 3 minutos"]]})},
angustia_difusa:{emoji:"🌫️",title:"Angustia difusa",
 steps:[
  {v:"problema",q:"¿Hay un problema definido?",options:[
    ["si","📌 Sí, concreto"],["no","🌫️ No, sólo sensación"],["nose","❓ No sé todavía"]]},
  {v:"primer",q:"Observa 90 segundos sin llenar el hueco. ¿Cuál fue el primer pensamiento que llegó?",options:[
    ["futuro","🔮 La mente propuso un futuro"],["culpable","👤 La mente buscó un culpable"],
    ["explicacion","🧩 La mente exigió una explicación"],["ninguno","🌿 Ninguno claro"]]}],
 conclude:(a)=>({hecho:"Sensación sin problema definido"+(a.problema==="si"?" — apareció uno concreto.":"."),
  inferencia:a.problema==="si"?"Si hay problema definido, cambia de ruta: eso ya es accionable."
    :"No necesitas inventar una causa para justificar lo que siente tu cuerpo.",
  lines:[a.primer&&a.primer!=="ninguno"
    ?"Detectaste a la mente intentando asignar "+(a.primer==="futuro"?"un futuro":a.primer==="culpable"?"un culpable":"una explicación")+". Verla es el entrenamiento."
    :"Toleraste 90 segundos sin rellenar. Eso es exactamente el músculo."],
  adult:a.problema==="si"?[["resolver","Definir el hecho y pasar a Resolver"]]
    :[["tolerar","Sostener sin explicación 90 segundos más"],["cuerpo","Registrar cómo está el cuerpo"]]})},
angustia_hecho_real:{emoji:"📌",title:"Preocupación por un hecho real",
 steps:[
  {v:"hecho",q:"Nómbralo: ¿cuál es el HECHO observable (no el escenario)?",options:[
    ["nombrado","✍️ Lo tengo nombrado"],["mezclado","🌀 Está mezclado con escenarios"]]},
  {v:"decision",q:"¿Existe una decisión que sí corresponde HOY?",options:[
    ["si","✅ Sí, hay una decisión de hoy"],["falta","📋 Falta información para decidir"],
    ["no","⏳ Hoy no corresponde decidir"]]},
  {v:"info",q:"¿Qué información falta y de quién depende?",options:[
    ["mia","🙋 Puedo obtenerla yo"],["tercero","👥 Depende de alguien más"],["tiempo","⏳ Sólo el tiempo la dará"]]}],
 conclude:(a)=>({hecho:"Hay un hecho real que te importa. Eso merece respeto, no minimización.",
  inferencia:"Separar hecho, decisión de hoy, información faltante y escenario que aún no existe evita resolver cien futuros.",
  lines:["Hoy sí corresponde: la decisión u obtención de información que marcaste.",
   "Hoy no corresponde: resolver todos los futuros."],
  adult:a.decision==="si"?[["accion","Ejecutar la decisión de hoy"],["revision","Fijar cuándo revisar de nuevo"]]
    :a.info==="mia"?[["obtener","Obtener la información una vez, de la fuente correcta"]]
    :[["revision","Fijar próxima revisión y soltar hasta entonces"]]})},
anticipatoria:{emoji:"🔮",title:"Ansiedad anticipatoria",
 steps:[
  {v:"evento",q:"¿Qué evento futuro estás ensayando?",options:[
    ["trabajo","💼 Algo de trabajo"],["salud","🩺 Algo de salud"],["vinculo","❤️ Algo de un vínculo"],
    ["dinero","💰 Algo de dinero"],["otro","📦 Otro"]]},
  {v:"control",q:"¿Qué parte controlas de verdad?",options:[
    ["preparacion","🧰 Mi preparación"],["conducta","🚶 Mi conducta ese día"],["nada","🌫️ Casi nada"]]},
  {v:"prep",q:"¿Existe UNA acción preparatoria real (no otra vuelta mental)?",options:[
    ["si","✅ Sí, una concreta"],["hecha","☑️ Ya está hecha"],["no","🚫 No existe"]]},
  {v:"revision",q:"¿Cuándo volverás a revisarlo?",options:[
    ["hoy_noche","🌙 Hoy en la noche"],["manana","🌅 Mañana"],["evento","📅 El día del evento"]]}],
 conclude:(a)=>({hecho:"Ensayas un evento que aún no ocurre.",
  inferencia:"Tu mente intenta controlar la parte que no se puede controlar ensayándola.",
  lines:["Prepararte una vez puede servir. Ensayar cien veces ya no es preparación.",
   "Acción real: "+(a.prep==="si"?"la que marcaste.":a.prep==="hecha"?"ya está hecha.":"no existe; entonces no hay nada que ensayar."),
   "Próxima revisión: "+(a.revision==="hoy_noche"?"hoy en la noche.":a.revision==="manana"?"mañana.":"el día del evento."),
   "Hasta entonces: no continuar simulando."],
  adult:[["prep","Hacer la acción preparatoria (si existe)"],["cerrar","Cerrar el ensayo hasta la revisión"]]})},
incertidumbre_info:{emoji:"🌫️",title:"Incertidumbre con información disponible",
 steps:[
  {v:"fuente",q:"¿Cuál es LA fuente correcta (una sola)?",options:[
    ["persona","👤 Una persona concreta"],["documento","📄 Un documento/sitio"],["resultado","🧪 Un resultado que llegará"]]},
  {v:"momento",q:"¿Cuál es el momento razonable para revisar UNA vez?",options:[
    ["ahora","⏱️ Ahora, una vez"],["tarde","🌇 Más tarde hoy"],["manana","🌅 Mañana"]]}],
 conclude:(a)=>({hecho:"La información existe y puede obtenerse.",
  inferencia:"Comprobar muchas veces no la hace llegar antes; sólo entrena el circuito de comprobación.",
  lines:["Revisa UNA vez en el momento que marcaste, y cierra."],
  adult:[["revisar","Revisar una vez y cerrar"],["medir","Medir cuánto tiempo aguantas sin comprobar"]]})},
incertidumbre_sin_info:{emoji:"🕳️",title:"Incertidumbre sin respuesta disponible",
 steps:[
  {v:"pregunta",q:"Nombra la pregunta abierta (sin resolverla)",options:[
    ["nombrada","✍️ Nombrada"],["varias","🌀 Son varias"]]},
  {v:"conducta",q:"¿Qué conducta tuya CONTINÚA aunque la pregunta siga abierta?",options:[
    ["trabajo","💼 Mi trabajo"],["cuidado","🫀 Mi cuidado básico"],["vinculo","❤️ Mi forma de tratar al otro"],
    ["dia","📆 Mi plan del día"]]}],
 conclude:()=>({hecho:"La pregunta no tiene respuesta disponible hoy.",
  inferencia:"Buscar certeza absoluta donde no hay información es un bucle, no una investigación.",
  lines:["No resolviste la pregunta; comprobaste que puedes seguir funcionando sin resolverla.",
   "Eso es tolerancia real, y se registra."],
  adult:[["continuar","Ejecutar la conducta que continúa"],["medir","Medir tiempo sin comprobar"]]})},
rumiacion:{emoji:"🔁",title:"Rumiación",
 steps:[
  {v:"fase",q:"¿En qué fase está el bucle?",options:[
    ["escaneo","🔎 Escaneo"],["simulacion","🎞️ Simulación"],["caso","⚖️ Construcción de caso"],
    ["culpa","😔 Culpa"],["repeticion","🔁 Repetición sin información nueva"]]},
  {v:"datos",q:"¿Hay datos NUEVOS desde la última vuelta?",options:[
    ["si","🆕 Sí, algo nuevo"],["no","🚫 No, es lo mismo"]]},
  {v:"decision",q:"¿La siguiente vuelta cambia alguna decisión?",options:[
    ["si","✅ Sí"],["no","🚫 No"]]},
  {v:"busca",q:"¿Buscas verdad o alivio de la incertidumbre?",options:[
    ["verdad","🔍 Verdad"],["alivio","🛋️ Alivio"]]}],
 conclude:(a)=>({hecho:"Tema repetido"+(a.datos==="no"?" sin datos nuevos":" con algo nuevo")+
   (a.decision==="no"?" y sin decisión que cambie.":"."),
  inferencia:a.datos==="no"&&a.decision==="no"
    ?"Sin datos nuevos y sin decisión, la vuelta no es análisis: es obediencia al bucle."
    :"Si hay dato nuevo o decisión, conviértelo en UNA acción y cierra la vuelta.",
  lines:["La primera vuelta podía ser análisis. Las siguientes ya son obediencia al bucle."],
  adult:a.datos==="no"&&a.decision==="no"
    ?[["cortar","Cortar la vuelta: cambia de canal conductual 2 minutos"],["presencia","Volver al presente real por 90 segundos"]]
    :[["accion","Convertir el dato/decisión en una acción hoy"]]})},
stop_rumination_loop:{emoji:"⛔",title:"Bucle sin información nueva",
 steps:[
  {v:"inicio",q:"¿Cuándo empezó esta vuelta?",options:[
    ["hoy","📆 Hoy"],["dias","🗓️ Lleva días"],["semanas","📅 Semanas"]]}],
 conclude:()=>({hecho:"Mismo tema, sin evidencia nueva, sin decisión que cambie.",
  inferencia:"El bucle ya no produce información; sólo produce malestar y consumo de atención.",
  lines:["La primera vuelta podía ser análisis. Las siguientes ya son obediencia al bucle."],
  adult:[["cortar","Cambiar de canal conductual 2 minutos"],["registrar","Registrar el corte como dato"]]})},
impulso_fisico:{emoji:"🫀",title:"Impulso físico",
 steps:[
  {v:"origen",q:"¿Qué lo alimenta más ahora?",options:[
    ["craving","🚬 Craving directo"],["cansancio","😴 Cansancio"],["activacion","⚡ Activación"],
    ["habito","🔁 Hábito corporal"]]},
  {v:"curva",q:"El impulso es una curva: sube, pica y baja. ¿Dónde está?",options:[
    ["subiendo","📈 Subiendo"],["pico","⛰️ En el pico"],["bajando","📉 Bajando"]]}],
 conclude:(a)=>({hecho:"Impulso corporal por "+(a.origen||"craving")+", en curva "+(a.curva||"?")+".",
  inferencia:"El pico dura minutos; el cuerpo puede sostener una curva sin obedecerla.",
  lines:["Sostener el pico una vez alarga tu intervalo real. Eso queda medido."],
  adult:[["esperar","Sostener 5 minutos y reevaluar"],["agua","Agua + movimiento breve"],
   ["decidir","Consumir DECIDIDO (no automático), si eso eliges"]]})},
impulso_emocional:{emoji:"❤️",title:"Impulso emocional",
 steps:[
  {v:"promesa",q:"¿Qué promete darte esta sustancia?",options:[
    ["pausa","⏸️ Una pausa"],["alivio","🛋️ Alivio"],["compania","🤝 Compañía"],
    ["desconexion","🔌 Desconexión"],["premio","🎁 Premio"],["control","🎛️ Sensación de control"],
    ["tension","💆 Bajar tensión"]]}],
 conclude:(a)=>({hecho:"El impulso trae una promesa: "+(a.promesa||"alivio")+".",
  inferencia:"La necesidad es real; la sustancia es sólo el proveedor más rápido, no el único.",
  lines:["Si la necesidad es "+(a.promesa==="pausa"?"una pausa, puedes dártela sin humo":
   a.promesa==="compania"?"compañía, hay una versión real disponible":"legítima, elige el proveedor con los ojos abiertos")+"."],
  adult:[["directo","Darte la necesidad por vía directa (pausa/contacto/descanso)"],
   ["esperar","Esperar 5 minutos con la promesa a la vista"]]})},
impulso_automatico:{emoji:"🔁",title:"Consumo automático",
 steps:[
  {v:"disparo",q:"¿Qué lo disparó sin decisión?",options:[
    ["lugar","📍 El lugar"],["hora","🕐 La hora"],["secuencia","⛓️ Venía en secuencia"],
    ["gesto","🤚 El gesto ya estaba ocurriendo"]]}],
 conclude:(a)=>({hecho:"Consumo disparado por "+(a.disparo||"secuencia")+", sin decisión previa.",
  inferencia:"El automatismo no se combate con prohibición: se interrumpe con decisión.",
  lines:["No tienes que prohibirlo. Primero introduce entre 60 y 120 segundos de decisión."],
  adult:[["espera90","Insertar 90 segundos de decisión antes"],["romper","Romper UN eslabón de la secuencia (lugar/gesto)"]]})},
impulso_recompensa:{emoji:"🎁",title:"Impulso de recompensa",
 steps:[
  {v:"tipo",q:"Sé honesto: ¿cuál es?",options:[
    ["deliberado","🍷 Disfrute deliberado"],["automatico","🎁 Premio automático"],
    ["inercia","📦 Acumulación por inercia"]]}],
 conclude:(a)=>({hecho:"Recompensa tipo: "+(a.tipo||"?")+".",
  inferencia:a.tipo==="deliberado"?"El disfrute deliberado no es el enemigo; la inercia sí."
    :"El premio automático ya no premia: sólo repite.",
  lines:[a.tipo==="deliberado"?"Disfrútalo presente, con principio y fin."
    :"Un premio que no se decide no se disfruta; sólo se acumula."],
  adult:[["deliberar","Convertirlo en deliberado: decidir cuánto y hasta cuándo"],
   ["sustituir","Elegir un premio que sí registre placer"]]})},
impulso_evasion:{emoji:"🚪",title:"Impulso de evasión",
 steps:[
  {v:"corta",q:"¿Qué intenta cortar exactamente?",options:[
    ["emocion","💔 Una emoción"],["pensamiento","🧠 Un pensamiento"],
    ["sensacion","🫀 Una sensación"],["tarea","📋 Una tarea"]]}],
 conclude:(a)=>({hecho:"El consumo intenta cortar: "+(a.corta||"algo")+".",
  inferencia:"Cortar funciona minutos; lo cortado espera intacto en la puerta.",
  lines:["Nombrar lo que evitas ya reduce su tamaño. Está nombrado."],
  adult:[["mirar","Mirar lo evitado 90 segundos sin resolverlo"],
   ["micro","Un primer paso mínimo hacia la tarea/emoción"]]})},
tristeza:{emoji:"🌧️",title:"Tristeza",
 steps:[
  {v:"necesita",q:"¿Qué necesita de ti?",options:[
    ["descansar","🛏️ Descansar"],["acompanarte","🤲 Acompañarte"],["llorar","💧 Llorar"],
    ["hablar","🗣️ Hablar"],["reparar","🧰 Reparar algo"],["aceptar","🕊️ Aceptar una pérdida"],
    ["nada","🌿 No hacer nada todavía"]]}],
 conclude:(a)=>({hecho:"Hay tristeza presente y le pusiste nombre a su necesidad: "+(a.necesita||"?")+".",
  inferencia:"La tristeza no es ansiedad: no pide resolver, pide lugar.",
  lines:["No toda emoción difícil es un problema que deba desaparecer."],
  adult:[["dar","Darle exactamente lo que pidió"],["cuerpo","Registrar el cuerpo y dejarla estar"]]})},
vacio:{emoji:"🕳️",title:"Vacío",
 steps:[
  {v:"tolerar",q:"Primer movimiento: ¿puedes NO llenarlo 90 segundos?",options:[
    ["si","🌿 Sí, lo sostuve"],["dificil","🌫️ Costó, pero algo"],["no","🚪 Lo llené de inmediato"]]},
  {v:"via",q:"Si eliges actuar, ¿qué vía es de construcción, no de relleno?",options:[
    ["micro","🌱 Una microacción"],["presencia","👁️ Presencia en lo que hay"],
    ["curiosidad","🔭 Curiosidad por algo pequeño"]]}],
 conclude:(a)=>({hecho:"Vacío: falta de estímulo, sentido o contacto interno — no es soledad.",
  inferencia:"Llenar rápido enseña que el vacío es intolerable; sostenerlo enseña lo contrario.",
  lines:[a.tolerar==="si"?"Lo sostuviste. Ese registro vale más que llenarlo.":"El impulso de llenar apareció; verlo también es dato."],
  adult:[["micro","Hacer la microacción de construcción"],["sostener","Sostener 90 segundos más"]]})},
soledad:{emoji:"🌘",title:"Soledad",
 steps:[
  {v:"tipo",q:"¿Qué buscas realmente?",options:[
    ["compania","🤝 Compañía real"],["validacion","🪞 Validación"],["contacto","📞 Contacto con alguien concreto"]]}],
 conclude:(a)=>({hecho:"Soledad: necesidad de vínculo. Es una necesidad, no un defecto.",
  inferencia:a.tipo==="validacion"?"La validación calma minutos; el vínculo real alimenta días."
    :"Hay una vía real disponible y la nombraste.",
  lines:["Aceptar que necesitas vínculo es adulto, no débil."],
  adult:[["contactar","Contactar a UNA persona concreta hoy"],
   ["acompanarte","Acompañarte activamente (no scroll) 15 minutos"]]})},
insuficiencia_juez:{emoji:"⚖️",title:"El Juez",
 steps:[
  {v:"sentencia",q:"¿Cuál fue la sentencia exacta del Juez?",options:[
    ["capaz","🧠 'No eres capaz'"],["tarde","⏰ 'Vas tarde'"],["fallaste","❌ 'Volviste a fallar'"],
    ["menos","📉 'Eres menos que otros'"]]},
  {v:"estandar",q:"¿Qué estándar usa esa sentencia?",options:[
    ["humano","🧍 Uno humano y medible"],["imposible","🌌 Uno imposible/perfecto"],["ajeno","👥 Uno que ni siquiera es tuyo"]]},
  {v:"hecho",q:"Nombra UN hecho de esta semana que contradice al Juez",options:[
    ["tengo","✍️ Lo tengo"],["cuesta","🌫️ Me cuesta encontrarlo"]]}],
 conclude:(a)=>({hecho:"Sentencia del Juez identificada, con estándar "+(a.estandar||"?")+".",
  inferencia:"Un juez con estándar imposible no evalúa: castiga. Las afirmaciones positivas genéricas no sirven; los hechos sí.",
  lines:["Juez dice: la sentencia que marcaste.",
   "Hechos dicen: el contraejemplo que nombraste (o que buscarás en tu registro).",
   "Acción adulta: la que eliges abajo."],
  adult:[["hecho","Anotar el hecho que contradice la sentencia"],
   ["tarea","Hacer una tarea a estándar humano (no perfecto)"]]})},
celos:{emoji:"🪞",title:"Celos e inseguridad",
 steps:[
  {v:"sabes",q:"¿Qué SABES (hecho verificable)?",options:[
    ["hecho","📌 Hay un hecho concreto"],["nada","🌫️ Nada nuevo: es película"]]},
  {v:"completaste",q:"¿Qué parte completó tu mente sin evidencia?",options:[
    ["escena","🎞️ Una escena completa"],["intencion","🧠 Una intención ajena"],["futuro","🔮 Un futuro"]]},
  {v:"temes",q:"¿Qué temes perder de fondo?",options:[
    ["vinculo","❤️ El vínculo"],["lugar","🏠 Mi lugar/valor"],["control","🎛️ El control"]]}],
 conclude:(a)=>({hecho:a.sabes==="hecho"?"Hay un hecho; sepáralo de la escena que la mente completó."
    :"No hay dato nuevo: lo que corre es una película de comparación.",
  inferencia:"Comprobar y controlar dan alivio corto y erosionan la dignidad; la película se alimenta de cada comprobación.",
  lines:["¿Qué conducta preservaría tu dignidad aunque siga la incertidumbre? Esa es la pregunta que importa."],
  adult:[["dignidad","Elegir la conducta que preserva tu dignidad"],
   ["nocomprobar","Medir tiempo sin comprobar"],
   ["hablar","Si hay hecho real: conversación directa, sin juicio previo"]]})},
momento_bueno:{emoji:"✨",title:"Momento bueno",
 steps:[
  {v:"que",q:"✨ ¿Qué estuvo bien?",options:[
    ["paz","🌿 Paz"],["conexion","🤝 Conexión"],["logro","🏁 Logro"],["naturaleza","🌳 Naturaleza"],
    ["mika","🐕 Mika"],["trabajo","💼 Trabajo"],["movimiento","🏃 Movimiento"],
    ["compania","👥 Compañía"],["disfrute","😋 Disfrute"],["descanso","🛏️ Descanso"],
    ["sin_razon","🎈 Sin razón clara"]]}],
 conclude:(a)=>({hecho:"Hubo un momento bueno: "+(a.que||"")+".",
  inferencia:"Lo bueno también es dato; registrarlo enseña al sistema qué conservar.",
  lines:["Queda registrado para tus patrones de bienestar."],
  adult:[["conservar","Nombrar qué quieres conservar de esto"]]})},
accion_adulta:{emoji:"🧰",title:"Acción adulta",
 steps:[
  {v:"paso",q:"¿Cuál es el primer paso ejecutable HOY?",options:[
    ["definido","✍️ Definido"],["grande","🧱 Es muy grande: partirlo"]]}],
 conclude:()=>({hecho:"Hay un hecho real accionable.",
  inferencia:"Cuando existe acción, analizar más es una forma elegante de evitar.",
  lines:["Un paso hoy vale más que el plan perfecto de mañana."],
  adult:[["hacer","Hacer el primer paso ahora"],["agendar","Agendarlo con hora concreta"]]})}
};
export const GOOD_FOLLOWUPS=[
  {v:"favorecio",q:"¿Qué lo favoreció?",options:[["hice","🙋 Algo que hice"],["contexto","🌍 El contexto"],["alguien","👥 Alguien"],["azar","🎲 Llegó solo"]]},
  {v:"conservar",q:"¿Qué quieres conservar de esto?",options:[["ritmo","⏳ El ritmo"],["compania","🤝 La compañía"],["lugar","📍 El lugar"],["actitud","🧭 Mi actitud"]]},
  {v:"ausente",q:"¿Qué estaba ausente (que suele estar)?",options:[["prisa","🏃 La prisa"],["pantalla","📱 La pantalla"],["juicio","⚖️ El juicio"],["nada","➖ Nada notable"]]},
  {v:"distinto",q:"¿Qué fue distinto hoy?",options:[["orden","📋 El orden del día"],["cuerpo","🫀 Mi cuerpo"],["decision","✅ Una decisión"],["nada","➖ Nada claro"]]},
  {v:"sabor",q:"¿Fue calma, energía, conexión o satisfacción?",options:[["calma","🌿 Calma"],["energia","⚡ Energía"],["conexion","🤝 Conexión"],["satisfaccion","🏁 Satisfacción"]]}];

/* ===== Contrato de intervención (Parte IV) + aprendizaje (Parte X) ===== */
export function startIntervention(state, routeKey, ctx){
  const rec={id:uid(), route:routeKey, startedAt:nowISO(),
    initialState:{intensity:(ctx&&ctx.intensity)||null,
      dominantEmotion:(ctx&&ctx.dominantEmotion)||"",
      dominantMechanism:(ctx&&ctx.mechanism)||"",
      impulse:(ctx&&ctx.impulseType)||""},
    distinction:{fact:"",story:"",need:"",attentionDirection:(ctx&&ctx.attentionDirection)||""},
    interventionUsed:routeKey, adultAction:"", outcome:null};
  state.openIntervention=rec;
  return rec;
}
export function concludeIntervention(state, answers, conclusion, adultAction){
  const rec=state.openIntervention;
  if(!rec) return null;
  rec.answers=answers;
  rec.distinction.fact=conclusion.hecho||"";
  rec.distinction.story=conclusion.inferencia||"";
  rec.adultAction=adultAction||"";
  return rec;
}
export function closeIntervention(state, outcome){
  const rec=state.openIntervention;
  if(!rec) return null;
  rec.outcome={intensityAfter:outcome.intensityAfter!=null?outcome.intensityAfter:null,
    perspectiveChanged:!!outcome.perspectiveChanged,
    behaviorChanged:!!outcome.behaviorChanged,
    helped:outcome.helped||"partial"};
  addEvent(state,{eventType:"intervention",subtype:rec.route,
    context:{adultAction:rec.adultAction},contract:rec});
  learnTool(state, rec.route, rec.initialState.dominantMechanism||rec.route, rec.outcome);
  state.openIntervention=null;
  return rec;
}
export function toolStatsOf(state, toolId){
  if(!state.toolStats) state.toolStats={};
  if(!state.toolStats[toolId])
    state.toolStats[toolId]={timesShown:0,lastShownAt:null,helpedIntensity:0,
      helpedPerspective:0,helpedBehavior:0,disliked:0,worseStreak:0,
      contextEffectiveness:{},suspendedUntil:null};
  return state.toolStats[toolId];
}
export function markToolShown(state, toolId){
  const t=toolStatsOf(state,toolId);
  t.timesShown++; t.lastShownAt=nowISO();
  state.lastToolShown=toolId;
}
export function learnTool(state, toolId, mech, outcome){
  const t=toolStatsOf(state,toolId);
  if(outcome.intensityAfter!=null&&outcome.helped!=="worse") t.helpedIntensity++;
  if(outcome.perspectiveChanged) t.helpedPerspective++;
  if(outcome.behaviorChanged) t.helpedBehavior++;
  const delta=outcome.helped==="yes"?2:outcome.helped==="partial"?1
    :outcome.helped==="no"?-1:-2;
  if(!t.contextEffectiveness[mech]) t.contextEffectiveness[mech]={n:0,score:0};
  t.contextEffectiveness[mech].n++;
  t.contextEffectiveness[mech].score+=delta;
  if(outcome.helped==="worse"){
    t.worseStreak=(t.worseStreak||0)+1;
    if(t.worseStreak>=2){
      const d=new Date(); d.setDate(d.getDate()+14);
      t.suspendedUntil=d.toISOString(); t.worseStreak=0;
    }
  } else t.worseStreak=0;
}
export function pickToolFor(state, mech, candidates){
  const now=Date.now(), week=7*86400000;
  if(!state.toolStats) state.toolStats={};
  const scored=candidates.map(id=>{
    const t=state.toolStats[id];
    if(t&&t.suspendedUntil&&new Date(t.suspendedUntil).getTime()>now) return null;
    if(state.lastToolShown===id) return null; // nunca dos veces seguidas
    const ce=t&&t.contextEffectiveness[mech];
    const ctxScore=ce&&ce.n?ce.score/ce.n:0; // aprender por mecanismo, no global
    const recent7=t&&t.lastShownAt&&(now-new Date(t.lastShownAt).getTime())<week
      ?t.timesShown:0;
    if(t&&recent7>=2&&ctxScore<1.2) return null; // máx 2/7d salvo alta eficacia
    return {id, score:ctxScore};
  }).filter(Boolean);
  if(!scored.length) return candidates.find(c=>c!==state.lastToolShown)||candidates[0];
  scored.sort((a,b)=>b.score-a.score);
  return scored[0].id;
}
