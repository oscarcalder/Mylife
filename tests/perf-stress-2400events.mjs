import * as APP from "./src2/engine/index.js";
const E=APP.ENGINE||(APP.default&&APP.default.ENGINE);
// Prueba de estrés §17: miles de eventos sintéticos
let S=E.defaultState();
const t0=Date.now();
const now=Date.now();
for(let d=60;d>=1;d--){
  const day={id:E.uid(),startedAt:new Date(now-d*86400000).toISOString(),
    endedAt:new Date(now-d*86400000+16*3600000).toISOString(),status:"closed"};
  S.logicalDays.push(day);
  for(let k=0;k<40;k++){
    S.events.push({id:E.uid(),schemaVersion:"1",
      createdAt:new Date(now-d*86400000+k*20*60000).toISOString(),
      logicalDayId:day.id,source:"quick",
      eventType:k%3===0?"substance":k%3===1?"state":"body",
      subtype:k%3===0?"iqos":k%3===1?"dificil":"tenso",
      context:k%3===1?{emotion:"estres"}:{}});
  }
}
const built=Date.now()-t0;
console.log("Eventos sintéticos:",S.events.length,"· construcción:",built,"ms");
const t1=Date.now(); E.rebuildDerived(S); console.log("rebuildDerived:",Date.now()-t1,"ms");
const t2=Date.now(); E.recalcAllHypotheses(S); console.log("recalcAllHypotheses:",Date.now()-t2,"ms");
const t3=Date.now(); E.buildInsights(S); console.log("buildInsights:",Date.now()-t3,"ms");
const t4=Date.now(); E.buildRelationGraph(S); console.log("buildRelationGraph:",Date.now()-t4,"ms");
const t5=Date.now(); const ev=E.addEvent(S,{eventType:"substance",subtype:"cigarro"});
console.log("addEvent incremental (con 2400 previos):",Date.now()-t5,"ms");
const t6=Date.now(); E.brainStatus(S); console.log("brainStatus:",Date.now()-t6,"ms");
const t7=Date.now(); E.nicotineRecords(S); console.log("nicotineRecords (barrido total):",Date.now()-t7,"ms");
const total=Date.now()-t0;
console.log("\nTODO en",total,"ms · veredicto:",total<3000&&(Date.now()-t5)<200?"FLUIDO":"REVISAR");
