import * as APP from "./src2/engine/index.js";
const E = APP.ENGINE || (APP.default && APP.default.ENGINE);
let pass=0,fail=0;const out=[];
function t(ok,msg){out.push((ok?"✅":"❌")+" "+msg);ok?pass++:fail++;}

// ===== 16 escenarios clínicos: ruta correcta, conclusión específica, sin frase genérica =====
const FIX=[
 ["angustia real (hecho)",{dominantEmotion:"angustia",realityActionability:"hecho_real"},"angustia_hecho_real",{hecho:"nombrado",decision:"falta",info:"tercero"}],
 ["angustia difusa",{dominantEmotion:"angustia"},"angustia_difusa",{problema:"no",primer:"futuro"}],
 ["ansiedad anticipatoria",{mechanism:"anticipacion"},"anticipatoria",{evento:"trabajo",control:"preparacion",prep:"si",revision:"manana"}],
 ["incertidumbre sin información",{mechanism:"incertidumbre",infoAvailable:false},"incertidumbre_sin_info",{pregunta:"nombrada",conducta:"trabajo"}],
 ["rumiación por ex",{mechanism:"rumiacion"},"rumiacion",{fase:"repeticion",datos:"no",decision:"no",busca:"alivio"}],
 ["preocupación real por Mika",{dominantEmotion:"angustia",realityActionability:"hecho_real"},"angustia_hecho_real",{hecho:"nombrado",decision:"si",info:"mia"}],
 ["celos sin evidencia",{dominantEmotion:"celos"},"celos",{sabes:"nada",completaste:"escena",temes:"vinculo"}],
 ["insuficiencia profesional",{dominantEmotion:"insuficiencia"},"insuficiencia_juez",{sentencia:"capaz",estandar:"imposible",hecho:"tengo"}],
 ["craving físico",{impulseType:"fisico"},"impulso_fisico",{origen:"craving",curva:"pico"}],
 ["consumo automático",{impulseType:"automatico"},"impulso_automatico",{disparo:"secuencia"}],
 ["alcohol por recompensa",{impulseType:"recompensa"},"impulso_recompensa",{tipo:"automatico"}],
 ["mota por evasión",{impulseType:"evasion"},"impulso_evasion",{corta:"emocion"}],
 ["tristeza sin ansiedad",{dominantEmotion:"tristeza"},"tristeza",{necesita:"llorar"}],
 ["vacío",{dominantEmotion:"vacio"},"vacio",{tolerar:"si",via:"micro"}],
 ["soledad",{dominantEmotion:"soledad"},"soledad",{tipo:"contacto"}],
 ["día positivo",{dominantEmotion:"bien"},"momento_bueno",{que:"naturaleza"}],
];
const GENERIC=["respira profundo","todo va a estar bien","todo está bien","no pasa nada",
  "sólo es ansiedad","solo es ansiedad","cálmate","tranquilo","piensa positivo","tú puedes","eres suficiente"];
const firstLines=new Set();
let uniqueOk=true;
for(const [name,ctx,expected,answers] of FIX){
  const route=E.selectInterventionRoute(ctx);
  t(route===expected, "F ruta · "+name+" → "+route);
  const R=E.ROUTES[route];
  const c=R.conclude(answers);
  const all=(c.hecho+" "+c.inferencia+" "+c.lines.join(" ")).toLowerCase();
  const generic=GENERIC.filter(g=>all.includes(g));
  const bad=E.violatesLanguage(all);
  t(c.hecho.length>10&&c.inferencia.length>10&&c.lines.length>=1&&c.adult.length>=1
    &&generic.length===0&&bad.length===0,
    "F contenido · "+name+": hecho+inferencia+conclusión+acción, sin genéricas/vetadas"
    +(generic.length?(" [GENÉRICA: "+generic+"]"):"")+(bad.length?(" [VETADA: "+bad+"]"):""));
  if(firstLines.has(c.lines[0])&&route!=="angustia_hecho_real") uniqueOk=false; // mismo route repetido en fixtures 1 y 6
  firstLines.add(c.lines[0]);
}
t(uniqueOk,"F unicidad · rutas distintas concluyen distinto (cero plantilla única)");

// gates del orden §11
t(E.selectInterventionRoute({activationLevel:9,dominantEmotion:"angustia"})==="activacion_regular",
  "F gate · activación intensa se regula primero");
t(E.selectInterventionRoute({realityActionability:"accionable",dominantEmotion:"tristeza"})==="accion_adulta",
  "F gate · hecho accionable → acción adulta antes que emoción");
t(E.selectInterventionRoute({mechanism:"rumiacion",noNewData:true})==="stop_rumination_loop",
  "F gate · bucle sin dato nuevo → stop_rumination_loop");

// discriminador SOS
t(E.routeFromDiscriminator("pelicula","pasado")==="rumiacion"
  &&E.routeFromDiscriminator("pelicula","futuro")==="anticipatoria"
  &&E.routeFromDiscriminator("dolor","celos")==="celos"
  &&E.routeFromDiscriminator("urgencia","evasion")==="impulso_evasion",
  "F discriminador · película/dolor/urgencia enrutan específico");

// ===== Contrato de intervención (IV) =====
let S=E.defaultState();
E.startIntervention(S,"impulso_fisico",{intensity:7,mechanism:"compulsión / obediencia",impulseType:"fisico"});
E.concludeIntervention(S,{origen:"craving",curva:"pico"},
  E.ROUTES.impulso_fisico.conclude({origen:"craving",curva:"pico"}),"esperar");
E.markToolShown(S,"impulso_fisico");
E.closeIntervention(S,{intensityAfter:7,perspectiveChanged:false,behaviorChanged:true,helped:"partial"});
const iev=S.events.find(e=>e.eventType==="intervention");
t(!!iev&&iev.contract.initialState.intensity===7&&iev.contract.outcome.behaviorChanged===true
  &&iev.contract.outcome.intensityAfter===7&&iev.contract.adultAction==="esperar",
  "C contrato · guarda inicial/distinción/acción/resultado; conducta cambió con intensidad igual = éxito conductual");
t(S.toolStats.impulso_fisico.helpedBehavior===1&&S.toolStats.impulso_fisico.timesShown===1,
  "C aprendizaje · helpedBehavior y timesShown registrados");

// ===== Aprendizaje (X): no repetir, suspensión por empeorar 2 veces, por contexto =====
S=E.defaultState();
E.markToolShown(S,"tristeza");
const pick=E.pickToolFor(S,"tristeza",["tristeza","vacio","soledad"]);
t(pick!=="tristeza","X no repetir · la última mostrada queda excluida ("+pick+")");
E.learnTool(S,"vacio","vacio",{helped:"worse"});
E.learnTool(S,"vacio","vacio",{helped:"worse"});
t(!!S.toolStats.vacio.suspendedUntil,"X suspensión · dos 'peor' seguidos suspenden 14 días");
E.learnTool(S,"soledad","rumiacion",{helped:"yes"});
E.learnTool(S,"soledad","rumiacion",{helped:"yes"});
const ce=S.toolStats.soledad.contextEffectiveness;
t(ce.rumiacion&&ce.rumiacion.n===2&&!ce.angustia_corporal,
  "X contexto · eficacia por mecanismo, sin generalizar a otros");

// ===== Microestados (VI): evidencia mínima y máximo uno =====
S=E.defaultState();
t(E.inferMicrostate(S)===null,"M microestado · sin evidencia = silencio");
const now=Date.now();
for(let k=0;k<3;k++)
  S.events.push({id:E.uid(),eventType:"substance",subtype:"iqos",
    createdAt:new Date(now-(50-k*20)*60000).toISOString(),logicalDayId:E.getOpenDay(S).id});
const ms=E.inferMicrostate(S);
t(ms&&ms.key==="acelerado"&&ms.explain.includes("3 consumos"),
  "M microestado · ⚡ Acelerado con explicación numérica: "+(ms?ms.explain:""));

// ===== Microvictoria (VI): sólo si ocurrió algo real, prioridad correcta =====
S=E.defaultState();
t(E.buildMicrovictory(S)===null,"M microvictoria · sin evento real = nada que premiar");
E.startIntervention(S,"impulso_fisico",{intensity:8});
E.concludeIntervention(S,{},E.ROUTES.impulso_fisico.conclude({}),"esperar");
E.closeIntervention(S,{intensityAfter:7,perspectiveChanged:false,behaviorChanged:true,helped:"partial"});
const mv=E.buildMicrovictory(S);
t(mv&&mv.kind==="impulso_tolerado"&&mv.text.includes("no obedeciste"),
  "M microvictoria · impulso tolerado con intensidad alta = doble mérito");

// ===== Vectores (VI): umbral y explicación =====
S=E.defaultState();
const d0=E.getOpenDay(S).id;
t(E.dayVectors(S,d0).ok===false,"V vectores · pocos datos = no mostrar");
const mk=(type,extra)=>S.events.push(Object.assign({id:E.uid(),eventType:type,
  createdAt:E.nowISO(),logicalDayId:d0},extra||{}));
mk("work");mk("work");mk("exercise");mk("microAction");
mk("state",{subtype:"dificil",inferred:{attention:"rumiacion"}});
mk("state",{subtype:"dificil",inferred:{attention:"rumiacion"}});
mk("state",{subtype:"dificil",context:{mentalIntent:"evitar"}});
mk("leisure");
const dv=E.dayVectors(S,d0);
t(dv.ok&&dv.vectors.find(v=>v.key==="construccion").pct===50
  &&dv.vectors.find(v=>v.key==="rumiacion").from.includes("estado ×2"),
  "V vectores · porcentajes correctos y contribuyentes explicados (construcción "
  +dv.vectors.find(v=>v.key==="construccion").pct+"%)");

// ===== Foco (IX) =====
S=E.defaultState();
E.setFocusTomorrow(S,"consumo");
t(E.checkFocus(S)===null,"IX foco · sin eventos relacionados aún = silencio");
S.events.push({id:E.uid(),eventType:"substance",subtype:"iqos",createdAt:E.nowISO(),logicalDayId:E.getOpenDay(S).id});
const fc=E.checkFocus(S);
t(fc&&fc.text.includes("🎯")&&fc.text.includes("primer consumo"),
  "IX foco · con evento relacionado, el Director lo señala");

// ===== Batallas (V): explicables, sin puntos por registrar =====
S=E.defaultState();
const day=E.getOpenDay(S).id;
for(let k=0;k<5;k++)
  S.events.push({id:E.uid(),eventType:"substance",subtype:"iqos",
    createdAt:new Date(Date.now()-k*7*60000).toISOString(),logicalDayId:day});
E.rebuildDerived(S);
let b=E.computeBattle(S,"nic_salud",[day]);
t(b.a.value===5&&b.b.value===0&&b.how.some(h=>h.includes("encadenados"))
  &&b.note.includes("nunca de registrar"),
  "B nicotina vs salud · registrar 5 consumos NO da puntos de salud; desglose explica encadenados");
b=E.computeBattle(S,"reg_auto",[day]);
t(b.a.value>=4&&b.how[0].includes("≤10m"),
  "B regulación vs automatismo · encadenados ≤10m contados y explicados: "+b.a.value);
S.events.push({id:E.uid(),eventType:"intervention",subtype:"impulso_fisico",
  createdAt:E.nowISO(),logicalDayId:day,contract:{outcome:{behaviorChanged:true,helped:"yes"}}});
b=E.computeBattle(S,"reg_auto",[day]);
t(b.b.value>=3&&b.how[1].includes("esperas"),
  "B regulación · espera con conducta distinta suma ×2 y se explica");
const b5=E.BATTLES.length;
t(b5===5&&E.BATTLES.every(x=>{const r=x.compute(S,[day]);return r.how.length>=1&&typeof r.note==="string"&&typeof r.action==="string";}),
  "B las 5 batallas existen con desglose, nota y acción concreta");

// ===== Lenguaje (VII): barrido de textos del router y batallas =====
let langBad=[];
Object.keys(E.ROUTES).forEach(k=>{
  const R=E.ROUTES[k];
  R.steps.forEach(s2=>{langBad=langBad.concat(E.violatesLanguage(s2.q));
    s2.options.forEach(o=>{langBad=langBad.concat(E.violatesLanguage(o[1]));});});
});
E.BATTLES.forEach(x=>{const r=x.compute(E.defaultState(),[]);
  langBad=langBad.concat(E.violatesLanguage(r.note)).concat(E.violatesLanguage(r.action));});
t(langBad.length===0,"L lenguaje · cero términos vetados en rutas y batallas"+(langBad.length?(": "+langBad):""));

// ===== Mood y sustancias (RC3.2) sanidad =====
S=E.defaultState();
const dd=E.getOpenDay(S).id;
S.events.push({id:E.uid(),eventType:"state",subtype:"bien",context:{emotion:"paz"},createdAt:E.nowISO(),logicalDayId:dd});
S.events.push({id:E.uid(),eventType:"state",subtype:"dificil",context:{emotion:"estres"},createdAt:E.nowISO(),logicalDayId:dd});
const mb=E.moodBalance(S,[dd]);
t(mb.totals.bien===1&&mb.totals.dificil===1&&mb.n===2,"RC3.2 mood · balance cuenta todos los estados");
const me=E.moodEmotions(S,[dd]);
t(me.length===2&&!me.some(x=>x.n===0),"RC3.2 mood · sólo emociones realmente registradas");
const cmp=E.moodComparison(S,[dd],[]);
t(cmp.ok===false,"RC3.2 mood · comparación bloqueada sin evidencia mínima");

// editEvent (RC3.2 §10)
S=E.defaultState();
const ev=E.addEvent(S,{eventType:"substance",subtype:"cigarro"});
E.editEvent(S,ev.id,{subtype:"iqos"});
t(ev.subtype==="iqos"&&ev.originalEvent.subtype==="cigarro"&&ev.editCount===1&&!!ev.editedAt
  &&E.editedEventsCount(S)===1,
  "RC3.2 corregir · conserva original, marca edición, recalcula");
E.editEvent(S,ev.id,{subtype:"mota"});
t(ev.originalEvent.subtype==="cigarro"&&ev.editCount===2,
  "RC3.2 corregir · el original NO se sobreescribe en la segunda edición");

console.log(out.join("\n"));
console.log("\nFIXTURES CLÍNICOS + ADDENDUM: "+pass+" pasadas · "+fail+" fallidas");
process.exit(fail?1:0);
