import { dayEvents } from "./logicalDay.js";
import { alcoholKcalOfDay, exerciseKcalOfDay, wakeEventOfDay, firstNicotineMinAfterWake } from "./calculations.js";
import { NICOTINE_IDS } from "../data/catalogs.js";
import { dayStats } from "./snapshots.js";
/* =====================================================================
   MÓDULO: engine/battles.js (Addendum V)
   Cinco batallas con unidad explicable, desglose y "¿Cómo se calculó?".
   Jamás lenguaje de derrota; los puntos salen de conducta, no de registrar.
===================================================================== */
function evsIn(state,dayIds,pred){
  const set=new Set(dayIds);
  return state.events.filter(e=>set.has(e.logicalDayId)&&pred(e));
}
const ctxIs=(o,k,vals)=>((o.inferred||{})[k]&&vals.includes((o.inferred||{})[k]))
  ||((o.context||{})[k]&&vals.includes((o.context||{})[k]));
function chained(state,dayIds){ // pares de consumo a ≤10 min
  const subs=evsIn(state,dayIds,e=>e.eventType==="substance")
    .sort((a,b)=>a.createdAt<b.createdAt?-1:1);
  let c=0;
  for(let i=1;i<subs.length;i++)
    if((new Date(subs[i].createdAt)-new Date(subs[i-1].createdAt))<10*60000) c++;
  return c;
}
function waits(state,dayIds){
  return evsIn(state,dayIds,e=>e.eventType==="intervention"
    &&e.contract&&e.contract.outcome&&e.contract.outcome.behaviorChanged).length;
}
export const BATTLES=[
{id:"alcohol_mov",emoji:"⚔️",title:"Alcohol vs Movimiento",unit:"kcal aprox.",
 compute(state,dayIds){
  let a=0,b=0; dayIds.forEach(id=>{a+=alcoholKcalOfDay(state,id);b+=exerciseKcalOfDay(state,id);});
  const micro=evsIn(state,dayIds,e=>e.eventType==="microAction").length;
  b+=micro*15;
  return {a:{label:"🍺 Alcohol",value:a},b:{label:"🏃 Movimiento",value:b},
   saldo:b-a,unit:"kcal",
   how:["Alcohol: suma de kcal aproximadas por bebida registrada.",
    "Movimiento: kcal de ejercicio + 15 kcal por microacción ("+micro+" microacciones).",
    "Saldo = movimiento − alcohol."],
   note:"El balance energético no elimina los efectos del alcohol sobre sueño, ánimo, conducta o salud.",
   action:b-a<0?"Una microacción de 5 minutos mueve el saldo hoy.":"El movimiento va delante: consérvalo."};}},
{id:"nic_salud",emoji:"🫁",title:"Nicotina vs Salud",unit:"puntos",
 compute(state,dayIds){
  const nic=evsIn(state,dayIds,e=>e.eventType==="substance"&&NICOTINE_IDS.includes(e.subtype));
  const parts=[];let pts=0;
  // primer consumo retrasado vs promedio propio
  const gaps=dayIds.map(id=>firstNicotineMinAfterWake(state,id)).filter(g=>g!=null);
  if(gaps.length>=2){
    const last=gaps[gaps.length-1], avg=gaps.slice(0,-1).reduce((x,y)=>x+y,0)/(gaps.length-1);
    if(last>avg){ const p=Math.min(20,Math.round((last-avg)/6)); pts+=p;
      parts.push("Retrasar primera nicotina: +"+p+" ("+Math.round(last)+"m vs "+Math.round(avg)+"m propios)");}
  }
  // intervalos: comparar mitades del periodo
  const times=nic.map(e=>new Date(e.createdAt).getTime()).sort((x,y)=>x-y);
  const ivs=[]; for(let i=1;i<times.length;i++){const g=(times[i]-times[i-1])/60000; if(g<16*60) ivs.push(g);}
  if(ivs.length>=6){
    const h=Math.floor(ivs.length/2);
    const a1=ivs.slice(0,h).reduce((x,y)=>x+y,0)/h, a2=ivs.slice(h).reduce((x,y)=>x+y,0)/(ivs.length-h);
    if(a2>a1){const p=Math.min(15,Math.round((a2-a1)/8)); pts+=p;
      parts.push("Intervalo en aumento: +"+p+" ("+Math.round(a1)+"m → "+Math.round(a2)+"m)");}
  }
  const w=waits(state,dayIds);
  if(w){pts+=w*8;parts.push("Impulsos tolerados con conducta distinta: +"+(w*8)+" ("+w+")");}
  let exK=0;dayIds.forEach(id=>{exK+=exerciseKcalOfDay(state,id);});
  if(exK){const p=Math.min(15,Math.round(exK/40));pts+=p;parts.push("Ejercicio: +"+p);}
  let sleepPts=0;
  dayIds.forEach(id=>{const s=dayStats(state,id); if(s.sleepMin&&s.sleepMin>=420) sleepPts+=5;});
  if(sleepPts){pts+=sleepPts;parts.push("Noches de 7h+: +"+sleepPts);}
  const ch=chained(state,dayIds);
  const nightNic=nic.filter(e=>{const h=new Date(e.createdAt).getHours();return h>=22||h<5;}).length;
  return {a:{label:"🚬 Nicotina",value:nic.length},b:{label:"🌱 Salud",value:pts},
   saldo:pts-nic.length,unit:"puntos",
   how:["Nicotina = total de consumos ("+nic.filter(e=>e.subtype==="cigarro").length+" cigarro · "
     +nic.filter(e=>e.subtype==="iqos").length+" IQOS · "+nightNic+" nocturnos · "+ch+" encadenados)."]
     .concat(parts.length?parts:["Salud aún sin puntos: nacen de retrasar, espaciar, tolerar, moverse y dormir — no de registrar."]),
   note:"Los puntos de salud salen de conducta medida contra tu propio promedio, nunca de registrar más.",
   action:"El punto más barato hoy: 90 segundos de decisión antes del siguiente."};}},
{id:"claridad_mota",emoji:"🧠",title:"Claridad vs Mota",unit:"índice personal",
 compute(state,dayIds){
  const mota=evsIn(state,dayIds,e=>e.eventType==="substance"&&e.subtype==="mota");
  const nearSleep=mota.filter(m=>{
    const day=state.logicalDays.find(d=>d.id===m.logicalDayId);
    return day&&day.endedAt&&(new Date(day.endedAt)-new Date(m.createdAt))<120*60000;}).length;
  let cl=0; const parts=[];
  const pres=evsIn(state,dayIds,e=>e.eventType==="train"||ctxIs(e,"attention",["presente_real"])).length;
  if(pres){cl+=pres*2;parts.push("Presencia/entrenamiento: +"+(pres*2));}
  const work=evsIn(state,dayIds,e=>e.eventType==="work").length;
  if(work){cl+=work*2;parts.push("Bloques de enfoque: +"+(work*2));}
  let hiE=0; dayIds.forEach(id=>{const w=wakeEventOfDay(state,id);
    if(w&&(w.context||{}).wakeEnergy==="alta") hiE++;});
  if(hiE){cl+=hiE*3;parts.push("Despertares con energía: +"+(hiE*3));}
  let exK=0;dayIds.forEach(id=>{exK+=exerciseKcalOfDay(state,id);});
  if(exK){const p=Math.min(10,Math.round(exK/50));cl+=p;parts.push("Ejercicio: +"+p);}
  return {a:{label:"🌿 Mota",value:mota.length},b:{label:"🧠 Claridad",value:cl},
   saldo:cl-mota.length,unit:"índice",
   how:["Mota = usos ("+nearSleep+" a menos de 2h del sueño)."]
    .concat(parts.length?parts:["Claridad sin puntos aún: presencia, enfoque, energía y movimiento los generan."]),
   note:"Índice personal contra tu propia línea base. No mide neurocognición ni es diagnóstico.",
   action:"La claridad se compra barata en la mañana: primer bloque sin humo."};}},
{id:"pres_rumi",emoji:"🌿",title:"Presencia vs Rumiación",unit:"eventos",
 compute(state,dayIds){
  const rumi=evsIn(state,dayIds,e=>e.eventType==="state"
    &&ctxIs(e,"attention",["rumiacion","futuro_imaginario"])).length;
  const comp=evsIn(state,dayIds,e=>ctxIs(e,"mentalIntent",["comprobar"])).length;
  const ret=evsIn(state,dayIds,e=>e.eventType==="train"||ctxIs(e,"attention",["presente_real"])).length;
  const adult=evsIn(state,dayIds,e=>e.eventType==="intervention"&&e.context&&e.context.adultAction).length;
  const good=evsIn(state,dayIds,e=>e.eventType==="state"&&e.subtype==="bien").length;
  const wl=evsIn(state,dayIds,e=>e.eventType==="work"||e.eventType==="leisure").length;
  const p=ret*2+adult*2+good+wl;
  return {a:{label:"🔁 Rumiación",value:rumi+comp},b:{label:"🌿 Presencia",value:p},
   saldo:p-(rumi+comp),unit:"eventos",
   how:["Rumiación = episodios de bucle/futuro imaginario ("+rumi+") + comprobaciones ("+comp+").",
    "Presencia = retornos y entrenamiento ×2 ("+ret+"), acción adulta ×2 ("+adult+"), momentos buenos ("+good+"), trabajo/ocio consciente ("+wl+")."],
   note:"Los retornos cuentan doble: volver es el músculo, no no-irse.",
   action:"Un retorno de 90 segundos ahora mismo suma al lado verde."};}},
{id:"reg_auto",emoji:"❤️",title:"Regulación vs Automatismo",unit:"eventos",
 compute(state,dayIds){
  const ch=chained(state,dayIds);
  const comp=evsIn(state,dayIds,e=>ctxIs(e,"mentalIntent",["comprobar"])).length;
  const auto=evsIn(state,dayIds,e=>e.eventType==="intervention"&&e.subtype==="impulso_automatico").length;
  const w=waits(state,dayIds);
  const delib=evsIn(state,dayIds,e=>e.eventType==="intervention"
    &&(e.subtype==="impulso_recompensa"||(e.contract&&e.contract.adultAction==="deliberar"))).length;
  const helped=evsIn(state,dayIds,e=>e.eventType==="intervention"
    &&e.contract&&e.contract.outcome&&e.contract.outcome.helped==="yes").length;
  const reg=w*2+delib+helped;
  return {a:{label:"🔁 Automatismo",value:ch+comp+auto},b:{label:"❤️ Regulación",value:reg},
   saldo:reg-(ch+comp+auto),unit:"eventos",
   how:["Automatismo = consumos encadenados ≤10m ("+ch+"), comprobaciones ("+comp+"), impulsos automáticos detectados ("+auto+").",
    "Regulación = esperas con conducta distinta ×2 ("+w+"), consumo deliberado ("+delib+"), intervenciones que sirvieron ("+helped+")."],
   note:"Detectar un automatismo también es regulación en formación.",
   action:"Insertar 90 segundos de decisión rompe el eslabón más barato."};}}];
export function computeBattle(state,id,dayIds){
  const b=BATTLES.find(x=>x.id===id);
  return b?Object.assign({id:b.id,emoji:b.emoji,title:b.title},b.compute(state,dayIds)):null;
}
