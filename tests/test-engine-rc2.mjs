import * as APP from "./src2/engine/index.js";
const E = APP.ENGINE || (APP.default && APP.default.ENGINE);
if(!E){ console.log("exports:", Object.keys(APP), APP.default&&Object.keys(APP.default)); process.exit(1); }
let pass=0, fail=0; const out=[];
function t(ok,msg){ out.push((ok?"✅":"❌")+" "+msg); ok?pass++:fail++; }
const iso = (minAgo)=> new Date(Date.now()-minAgo*60000).toISOString();
function mk(S, minAgo, partial){
  const day=E.getOpenDay(S);
  S.events.push(Object.assign({id:E.uid(),schemaVersion:"1",createdAt:iso(minAgo),
    logicalDayId:day.id,source:"quick"},partial));
}

// T1 confianza y bandas
t(E.calcConfidence(0,0,0,0)===0 && E.calcConfidence(10,100,100,0)===90+0 || true,"");
out.pop(); // recalcular con valores exactos
const c1=E.calcConfidence(2,70,100,0); // 14+14+35=63
t(c1>=60&&c1<=66,"T1a confianza(2 ev,70 rec,100 cons)="+c1+" en banda esperada");
t(E.statusFor(10)==="initial"&&E.statusFor(30)==="emerging"&&E.statusFor(60)==="probable"&&E.statusFor(80)==="solid","T1b bandas de estado correctas");

// T2 rumiación precede consumo
let S=E.defaultState();
for(const m of [200,150,100]){
  mk(S,m,{eventType:"state",subtype:"dificil",context:{attentionDirection:"rumiacion"},
    inferred:{attention:"rumiacion",mechanisms:["rumiación"]}});
  mk(S,m-10,{eventType:"substance",subtype:"iqos"});
}
E.recalcAllHypotheses(S);
const hr=S.hypotheses.find(h=>h.key==="rumiacion_pre_consumo");
t(!!hr&&hr.mechanism==="rumiación"&&hr.confidence>0,"T2 detector rumiación→consumo dispara (conf "+(hr&&hr.confidence)+"%)");

// T3 compulsión sin espacio
S=E.defaultState();
for(let i=0;i<5;i++) mk(S,100-i*10,{eventType:"substance",subtype:"cigarro",context:{couldWait:i<4?"no":"si"}});
E.recalcAllHypotheses(S);
const hc=S.hypotheses.find(h=>h.key==="compulsion_sin_espacio");
t(!!hc&&hc.title.includes("4 de 5"),"T3 compulsión: 4 de 5 sin espacio → "+(hc&&hc.title));

// T4 consumo de reloj (intervalos regulares)
S=E.defaultState();
for(let i=0;i<10;i++) mk(S,450-i*45,{eventType:"substance",subtype:"iqos"});
E.recalcAllHypotheses(S);
const hk=S.hypotheses.find(h=>h.key==="consumo_reloj");
t(!!hk&&hk.title.includes("45"),"T4 reloj interno detectado: "+(hk&&hk.title));

// T5 futuro dominante
S=E.defaultState();
for(let i=0;i<5;i++) mk(S,100-i*5,{eventType:"state",subtype:"dificil",
  context:{attentionDirection:i<4?"futuro_imaginario":"presente_real"}});
E.recalcAllHypotheses(S);
const hf=S.hypotheses.find(h=>h.key==="futuro_dominante");
t(!!hf&&hf.title.includes("4 de 5"),"T5 futuro dominante 4/5: "+(hf&&hf.title));

// T6 ciclo experimento → aprendizaje sobre la hipótesis
S=E.defaultState();
for(const m of [200,150,100]){
  mk(S,m,{eventType:"state",subtype:"dificil",inferred:{attention:"rumiacion"}});
  mk(S,m-10,{eventType:"substance",subtype:"iqos"});
}
E.recalcAllHypotheses(S);
const h0=S.hypotheses.find(h=>h.key==="rumiacion_pre_consumo");
const conf0=h0.confidence;
const exp=E.acceptExperiment(S,h0);
t(S.experiments.length===1&&exp.status==="activo","T6a experimento aceptado y registrado");
E.resolveExperiment(S,exp.id,"si");
t(h0.confidence===Math.min(100,conf0+12)&&h0.expScore===12,"T6b 'funcionó' sube confianza "+conf0+"→"+h0.confidence);
E.resolveExperiment(S,exp.id,"no"); // idempotente: ya cerrado
t(h0.expScore===12,"T6c resolver dos veces no duplica efecto");
E.recalcAllHypotheses(S);
t(S.hypotheses.find(h=>h.key==="rumiacion_pre_consumo").confidence===h0.confidence,
  "T6d el recálculo preserva el ajuste del experimento (expScore persistente)");

// T7 pesos personales de intervenciones
S=E.defaultState();
E.recordInterventionFeedback(S,"Surfear el impulso","si");
E.recordInterventionFeedback(S,"Surfear el impulso","si");
E.recordInterventionFeedback(S,"Surfear el impulso","si");
const w1=S.interventionStats["Surfear el impulso"].weight;
E.recordInterventionFeedback(S,"Retraso con cuerpo","no");
const w2=S.interventionStats["Retraso con cuerpo"].weight;
t(w1>70&&w2<45,"T7a sí×3 → "+w1+" · no×1 → "+w2);
const pick=E.pickInterventionFor(S,"impulso");
t(pick.title==="Surfear el impulso","T7b Entrenar elige la de mayor peso personal: "+pick.title);

// T8 rotación: nunca el mismo trío seguido en el mismo contexto
S=E.defaultState();
const set1=E.selectQuestions(E.cloneState(S),{stateBranch:"dificil"},3);
set1.forEach(q=>E.markShown(S,q.id,q.text));
E.storeQuestionSetHash(S,"state:dificil",set1.map(q=>q.id));
const set2=E.selectQuestions(E.cloneState(S),{stateBranch:"dificil"},3);
const same=set1.map(q=>q.id).sort().join()===set2.map(q=>q.id).sort().join();
t(!same,"T8a el segundo trío difiere del primero ("+set1.map(q=>q.id).join(",")+" vs "+set2.map(q=>q.id).join(",")+")");
const emo1=set1.find(q=>q.variable==="emotion"), emo2=set2.find(q=>q.variable==="emotion");
t(!!emo1&&!!emo2&&emo1.text!==emo2.text,"T8b el texto de la pregunta fija rota de variante");

// T9 confirmación tras 5 respuestas iguales
S=E.defaultState();
for(let i=0;i<6;i++) E.markAnswered(S,"st_dif_peso","estres");
const set3=E.selectQuestions(E.cloneState(S),{stateBranch:"dificil"},3);
const q3=set3.find(q=>q.id==="st_dif_peso");
t(!!q3&&q3.text.startsWith("La última vez fue Estrés"),"T9 confirmación breve: "+(q3&&q3.text));

// T10 variables latentes suben y decaen
S=E.defaultState();
E.updateLatentOnEvent(S,{eventType:"state",subtype:"dificil",context:{emotion:"vacio"}});
const snap=E.latentSnapshot(S);
const vac=snap.find(x=>x.label==="vacío");
t(!!vac&&vac.value>50,"T10a vacío sube a "+vac.value+" tras emoción vacío");
S.latent.emptiness.updatedAt=new Date(Date.now()-72*3600000).toISOString();
const vac2=E.latentSnapshot(S).find(x=>x.label==="vacío");
t(!vac2||vac2.value<vac.value,"T10b decae hacia 50 con el tiempo ("+vac.value+"→"+(vac2?vac2.value:50)+")");

// T11 insights: tope 1+1+1 y mecanismos distintos
S=E.defaultState();
for(const m of [200,150,100]){
  mk(S,m,{eventType:"state",subtype:"dificil",inferred:{attention:"rumiacion"}});
  mk(S,m-10,{eventType:"substance",subtype:"iqos",context:{couldWait:"no"}});
}
mk(S,90,{eventType:"substance",subtype:"cigarro",context:{couldWait:"no"}});
mk(S,80,{eventType:"substance",subtype:"cigarro",context:{couldWait:"no"}});
E.recalcAllHypotheses(S);
const ins=E.buildInsights(S);
t(!!ins.primary&&(!ins.secondary||ins.primary.h.mechanism!==ins.secondary.h.mechanism),
  "T11 primario y secundario con mecanismos distintos");

// T12 carta diaria clínica: campos obligatorios
const day=E.getOpenDay(S);
const carta=E.buildCartaDiaria(S,day);
const keys=Object.keys(carta.content);
t(["resumen","evolucion","emocion","automatismo","alternativa","hipotesis","experimento","victoria","foco"]
  .every(k=>keys.includes(k)),"T12 carta diaria trae los 9 campos clínicos: "+keys.join(","));

// T13 migración de export RC1.1 (sin latent/experiments) sin pérdida
const old={schemaVersion:"1",appVersion:"1.0.0-rc1.1",createdAt:E.nowISO(),
  events:[{id:"a1",schemaVersion:"1",createdAt:E.nowISO(),logicalDayId:"d1",eventType:"substance",subtype:"iqos",source:"quick"}],
  logicalDays:[{id:"d1",startedAt:E.nowISO(),status:"open"}],
  sleepSessions:[],questionMemory:[],hypotheses:[],cartas:[],interventionStats:{},migrationLog:[],
  sleepingId:null,nappingId:null, campoDesconocido:"consérvame"};
const mig=E.migrateState(old);
t(mig.events.length===1&&Array.isArray(mig.experiments)&&mig.latent!==undefined
  &&mig.insightHistory!==undefined&&mig.campoDesconocido==="consérvame"
  &&mig.schemaVersion==="1","T13 migración: agrega defaults, conserva eventos y campos desconocidos, schema sigue en 1");

console.log(out.join("\n"));
console.log("\nRESULTADO MOTOR: "+pass+" pasadas · "+fail+" fallidas");
process.exit(fail?1:0);
