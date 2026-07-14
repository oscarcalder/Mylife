import * as APP from "./src2/engine/index.js";
const E = APP.ENGINE || (APP.default && APP.default.ENGINE);
let pass=0, fail=0; const out=[];
function t(ok,msg){ out.push((ok?"✅":"❌")+" "+msg); ok?pass++:fail++; }
const isoAgo=(min)=>new Date(Date.now()-min*60000).toISOString();
function addRaw(S,minAgo,partial,dayId){
  S.events.push(Object.assign({id:E.uid(),schemaVersion:"1",createdAt:isoAgo(minAgo),
    logicalDayId:dayId||E.getOpenDay(S).id,source:"quick"},partial));
}
function closedDay(S,daysAgo){
  const d={id:E.uid(),startedAt:isoAgo(daysAgo*1440+960),endedAt:isoAgo(daysAgo*1440),status:"closed"};
  S.logicalDays.push(d); return d;
}
const RUMI={eventType:"state",subtype:"dificil",inferred:{attention:"rumiacion",mechanisms:["rumiación"]}};

// ---- T14 snapshot + regeneración ----
let S=E.defaultState();
addRaw(S,100,{eventType:"substance",subtype:"iqos"});
addRaw(S,90,{eventType:"state",subtype:"bien",context:{emotion:"paz"}});
E.updateLatentOnEvent(S,S.events[1]);
E.recalcAllHypotheses(S);
const day=E.getOpenDay(S);
const snap=E.buildSnapshot(S,day);
t(snap.stats.nic===1&&snap.coachLine.length>0&&snap.algoVersion===E.APP_VERSION&&snap.regenerated===false,
  "T14a snapshot captura stats, coachLine y versión del algoritmo");
S.snapshots.push(snap);
addRaw(S,50,{eventType:"substance",subtype:"cigarro"});
E.regenerateSnapshotStats(S,snap);
t(snap.stats.nic===2&&snap.regenerated===true,"T14b regeneración desde eventos marca regenerated");

// ---- T15 derived: los eventos ganan ----
S=E.defaultState();
addRaw(S,100,{eventType:"substance",subtype:"iqos"});
const d1=E.getOpenDay(S).id;
E.rebuildDerived(S);
t(E.dayStats(S,d1).nic===1,"T15a dayStats correcto");
S.derived.days[d1].nic=999; S.derived.eventCount=-5; // corrupción
E.verifyDerived(S);
t(E.dayStats(S,d1).nic===1,"T15b derived corrupto se reconstruye: ganan los eventos");

// ---- T16 desglose + historial con razón ----
S=E.defaultState();
for(const m of [300,200,100]){ addRaw(S,m,RUMI); addRaw(S,m-10,{eventType:"substance",subtype:"iqos"}); }
E.recalcAllHypotheses(S);
let h=S.hypotheses.find(x=>x.key==="rumiacion_pre_consumo");
const b=h.breakdown;
t(b.evidencia+b.recencia+b.consistencia+b.contradiccion+b.experimentos===b.base
  && b.total===Math.max(0,Math.min(100,b.base)) && b.formula.includes("0.35"),
  "T16a desglose suma exacta y fórmula documentada: "+b.evidencia+"+"+b.recencia+"+"+b.consistencia+b.contradiccion+"+"+b.experimentos+"="+b.total);
t(h.confidenceHistory[0].reason==="hipótesis creada","T16b historial arranca con 'hipótesis creada'");

// ---- T17 tendencia de hipótesis ----
h.confidenceHistory=[{at:isoAgo(10*1440),confidence:40,reason:"x"},{at:isoAgo(60),confidence:h.confidence,reason:"y"}];
h.confidence=52;
t(E.trendOfHypothesis(h)==="↗","T17 tendencia ↗ con +12 en la semana");
h.confidence=33; t(E.trendOfHypothesis(h)==="↘","T17b tendencia ↘");

// ---- T18 prioridad clínica + silencio ----
S=E.defaultState();
addRaw(S,200,{eventType:"state",subtype:"dificil",context:{attentionDirection:"pasado"},inferred:{attention:"pasado"}});
addRaw(S,150,{eventType:"state",subtype:"dificil",context:{attentionDirection:"presente_real"}});
addRaw(S,120,{eventType:"state",subtype:"dificil",context:{attentionDirection:"presente_real"}});
addRaw(S,110,{eventType:"state",subtype:"dificil",context:{attentionDirection:"pasado"},inferred:{attention:"pasado"}});
E.recalcAllHypotheses(S);
let ins=E.buildInsights(S);
t(S.hypotheses.length>0 && ins.primary===null && ins.silenced===true,
  "T18a hipótesis débil bajo umbral → silencio (hyps="+S.hypotheses.length+")");
t(E.coachHomeLine(S).text.includes("Sigue viviendo"),"T18b Coach en Home: '🌿 ... Sigue viviendo.'");
for(const m of [90,80,70]){ addRaw(S,m,RUMI); addRaw(S,m-5,{eventType:"substance",subtype:"iqos"}); }
E.recalcAllHypotheses(S);
ins=E.buildInsights(S);
t(!!ins.primary && ins.primary.h.key==="rumiacion_pre_consumo",
  "T18c patrón fuerte supera el umbral y habla");

// ---- T19 Científico medido: compatible con criterio ----
S=E.defaultState();
for(let d=8;d>=4;d--){ // 5 días base: rumiación SIEMPRE termina en consumo
  const cd=closedDay(S,d);
  addRaw(S,d*1440+300,RUMI,cd.id);
  addRaw(S,d*1440+290,{eventType:"substance",subtype:"iqos"},cd.id);
  addRaw(S,d*1440+100,RUMI,cd.id);
  addRaw(S,d*1440+95,{eventType:"substance",subtype:"iqos"},cd.id);
}
E.recalcAllHypotheses(S);
h=S.hypotheses.find(x=>x.key==="rumiacion_pre_consumo");
const exp=E.acceptExperiment(S,h,3);
t(exp.status==="activo"&&exp.metric==="rumi_conv"&&exp.baseline===1&&exp.closesAtDayCount===8
  &&exp.successCriterion.includes("70%"),"T19a protocolo: métrica, base=1.0, criterio y cierre definidos ANTES");
for(let d=3;d>=1;d--){ // 3 días de experimento: rumiación SIN consumo posterior
  const cd=closedDay(S,d);
  addRaw(S,d*1440+300,RUMI,cd.id);
  addRaw(S,d*1440+100,RUMI,cd.id);
}
const confBefore=h.confidence;
E.evaluateOpenExperiments(S);
t(exp.status==="compatible"&&exp.resultValue===0&&h.confidence===Math.min(100,confBefore+12),
  "T19b evaluación medida: conversión 1.0→0.0 → compatible, confianza "+confBefore+"→"+h.confidence);
t(h.confidenceHistory.some(x=>x.reason==="experimento compatible"),"T19c razón registrada en el ledger");

// ---- T20 inconcluso si no se cumplen condiciones mínimas ----
S=E.defaultState();
for(let d=8;d>=4;d--){ const cd=closedDay(S,d);
  addRaw(S,d*1440+300,RUMI,cd.id); addRaw(S,d*1440+290,{eventType:"substance",subtype:"iqos"},cd.id);
  addRaw(S,d*1440+100,RUMI,cd.id); addRaw(S,d*1440+95,{eventType:"substance",subtype:"iqos"},cd.id); }
E.recalcAllHypotheses(S);
h=S.hypotheses.find(x=>x.key==="rumiacion_pre_consumo");
const exp2=E.acceptExperiment(S,h,3);
for(let d=3;d>=1;d--){ closedDay(S,d); } // ventana SIN rumiaciones (n<minSamples)
const cb=h.confidence;
E.evaluateOpenExperiments(S);
t(exp2.status==="inconcluso"&&h.confidence===cb,"T20 sin muestras mínimas → inconcluso, confianza intacta");

// ---- T21 promoción a Ley Personal ----
h.confidence=80; h.status="solid"; h.createdAt=isoAgo(25*1440);
S.experiments.push({id:E.uid(),hypKey:h.key,status:"compatible",text:"x"});
S.experiments.push({id:E.uid(),hypKey:h.key,status:"compatible",text:"y"});
E.promoteLaws(S); E.promoteLaws(S);
t(S.laws.length===1&&S.laws[0].experimentsCompatible>=2,"T21 ley promovida una sola vez con 2+ compatibles y 21+ días");

// ---- T22 compuestas ----
S=E.defaultState();
t(E.compositeSnapshot(S).length===0,"T22a sin señal primaria → sin compuestas (honestidad)");
E.updateLatentOnEvent(S,{eventType:"state",subtype:"dificil",context:{emotion:"vacio"}});
E.updateLatentOnEvent(S,{eventType:"state",subtype:"dificil",context:{emotion:"miedo",mentalIntent:"castigarte"}});
E.updateLatentOnEvent(S,{eventType:"state",subtype:"dificil",context:{body:"cuello"}});
const comps=E.compositeSnapshot(S);
t(comps.length===10&&comps.every(c=>c.value>=0&&c.value<=100),
  "T22b 10 compuestas acotadas 0-100 con 3+ primarias activas");

// ---- T23 estilo ----
S=E.defaultState();
S.coachStyle={basal:"directo",learned:{directo:0,amable:0,tecnico:0},lastAskedAt:null};
t(E.styleOf(S)==="directo","T23a basal manda");
S.coachStyle.basal="adaptativo"; S.coachStyle.learned={directo:1,amable:3,tecnico:0};
t(E.styleOf(S)==="amable","T23b adaptativo elige el aprendido");
const fakeH={confidence:62,status:"probable",mechanism:"rumiación",evidenceEventIds:[],key:"k"};
const L={observation:"Parece repetirse: X.",why:"Por qué lo creo: ...",evidence:"Evidencia: 3",action:"Espera 2 min."};
const tec=E.styleLayers(L,fakeH,"tecnico"), dir=E.styleLayers(L,fakeH,"directo");
S.coachStyle={basal:"adaptativo",learned:{directo:0,amable:0,tecnico:0},lastAskedAt:null};
t(tec.observation.includes("62%")&&dir.action.startsWith("Hazlo:")&&fakeH.confidence===62,
  "T23c el estilo cambia tono, jamás la confianza");
t(E.shouldAskStyle(S,false)===true&&E.shouldAskStyle(S,true)===false,
  "T23d pregunta elegible salvo en pico de SOS");
E.recordStyleAnswer(S,"directo");
t(E.shouldAskStyle(S,false)===false,"T23e tras responder, 7 días de veda");

// ---- T24 grafo + ciclo ----
S=E.defaultState();
for(let d=7;d>=4;d--){ // días con mal sueño y mucha nicotina
  const cd=closedDay(S,d);
  addRaw(S,d*1440+400,RUMI,cd.id);
  addRaw(S,d*1440+390,{eventType:"substance",subtype:"iqos"},cd.id);
  addRaw(S,d*1440+380,{eventType:"state",subtype:"dificil",context:{emotion:"culpa"}},cd.id);
  addRaw(S,d*1440+370,RUMI,cd.id);
  addRaw(S,d*1440+360,{eventType:"substance",subtype:"iqos"},cd.id);
  addRaw(S,d*1440+350,{eventType:"state",subtype:"dificil",context:{emotion:"culpa"}},cd.id);
  addRaw(S,d*1440+340,RUMI,cd.id);
  S.sleepSessions.push({id:E.uid(),type:"mainSleep",durationMin:300,
    startedAt:isoAgo(d*1440+960),endedAt:isoAgo(d*1440+660)});
  addRaw(S,d*1440+655,{eventType:"wake",subtype:"mainSleep",context:{wakeEnergy:"baja"}},cd.id);
}
for(let d=3;d>=1;d--){ // días con buen sueño y poca nicotina
  const cd=closedDay(S,d);
  S.sleepSessions.push({id:E.uid(),type:"mainSleep",durationMin:480,
    startedAt:isoAgo(d*1440+1020),endedAt:isoAgo(d*1440+540)});
  addRaw(S,d*1440+535,{eventType:"wake",subtype:"mainSleep",context:{wakeEnergy:"alta"}},cd.id);
}
E.rebuildDerived(S);
const g=E.buildRelationGraph(S);
const hasRumiNic=g.edges.some(e=>e.from==="rumiacion"&&e.to==="nicotina"&&e.type==="precede");
const hasCycle=g.cycles.some(c=>c.chain.includes("rumiacion")&&c.chain.includes("nicotina")&&c.chain.includes("culpa"));
t(hasRumiNic,"T24a arista rumiación → precede → nicotina");
t(hasCycle,"T24b ciclo rumiación→nicotina→culpa detectado ("+g.cycles.length+" ciclos)");

// ---- T25 umbrales de honestidad ----
S=E.defaultState();
for(let d=10;d>=1;d--) closedDay(S,d);
E.rebuildDerived(S);
let tr=E.trendOfMetric(S,"nicotina");
t(tr.ok===false&&tr.msg.includes("preliminar"),"T25a 10 días → tendencia preliminar (mensaje honesto)");
S=E.defaultState();
for(let d=16;d>=1;d--){ const cd=closedDay(S,d);
  const n=d>8?6:3;
  for(let i=0;i<n;i++) addRaw(S,d*1440+400-i*30,{eventType:"substance",subtype:"iqos"},cd.id);
}
E.rebuildDerived(S);
tr=E.trendOfMetric(S,"nicotina");
t(tr.ok===true&&tr.dir==="↘","T25b 16 días válidos → tendencia ↘ real ("+tr.delta+"%)");
let as=E.assocOfMetrics(S,"sueno","nicotina","sueño","nicotina");
t(as.ok===false&&as.msg.includes("señal posible"),"T25c asociación bloqueada sin 30/20/30 (mensaje honesto)");
S=E.defaultState();
for(let d=34;d>=1;d--){ const cd=closedDay(S,d);
  const short=d%2===0; const dur=short?300:480; const endMin=d*1440+960-dur;
  S.sleepSessions.push({id:E.uid(),type:"mainSleep",durationMin:dur,
    startedAt:isoAgo(d*1440+960),endedAt:isoAgo(endMin)});
  addRaw(S,endMin,{eventType:"wake",subtype:"mainSleep",context:{}},cd.id);
  const n=short?7:2;
  for(let i=0;i<n;i++) addRaw(S,d*1440+400-i*20,{eventType:"substance",subtype:"iqos"},cd.id);
}
E.rebuildDerived(S);
as=E.assocOfMetrics(S,"sueno","nicotina","sueño","nicotina","Dormir menos se asocia con mayor consumo de nicotina");
t(as.ok===true&&as.phrase.includes("no causalidad")&&as.phrase.includes("asociación"),
  "T25d 34 días pareados → asociación con lenguaje no causal: r="+as.r);

// ---- T26 migración de experimentos RC2 ----
const old={schemaVersion:"1",events:[],logicalDays:[],sleepSessions:[],questionMemory:[],
  hypotheses:[],cartas:[],interventionStats:{},migrationLog:[],sleepingId:null,nappingId:null,
  latent:{},insightHistory:{},
  experiments:[{id:"e1",hypKey:"k",text:"x",status:"accepted",createdAt:E.nowISO()},
    {id:"e2",hypKey:"k",text:"y",status:"done",result:"si",createdAt:E.nowISO()}]};
const mig=E.migrateState(old);
t(mig.experiments[0].status==="activo"&&mig.experiments[0].selfReport===true
  &&mig.experiments[1].status==="compatible"&&Array.isArray(mig.laws)&&mig.snapshots!==undefined
  &&mig.schemaVersion==="1",
  "T26 experimentos RC2 → activo/compatible; laws/snapshots/derived agregados; schema sigue en 1");

console.log(out.join("\n"));
console.log("\nRESULTADO MOTOR RC3: "+pass+" pasadas · "+fail+" fallidas");
process.exit(fail?1:0);
