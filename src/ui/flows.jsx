import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import { ALCOHOL_TYPES, BODY_LABEL, BODY_OPTIONS, EXERCISES, EX_DURATIONS, MICROACTIONS, PLACES, STATE_BRANCHES } from "../data/catalogs.js";
import { inferFromAnswers } from "../data/questionBank.js";
import { substanceCountToday } from "../engine/calculations.js";
import { buildCarta3, buildCartaDiaria } from "../engine/cartas.js";
import { USER_NAME } from "../engine/config.js";
import { evaluateOpenExperiments, promoteLaws } from "../engine/director.js";
import { addEvent, patchEventContext } from "../engine/events.js";
import { closedDays, getOpenDay } from "../engine/logicalDay.js";
import { selectQuestions } from "../engine/questionSelector.js";
import { buildSnapshot } from "../engine/snapshots.js";
import { saveBackupRotating } from "../engine/storage.js";
import { Chip, QuestionRunner, Sheet } from "./atoms.jsx";
import { editEvent } from "../engine/events.js";
import { ROUTES, GOOD_FOLLOWUPS } from "../engine/clinicalRouter.js";
import { FOCUS_OPTIONS, setFocusTomorrow } from "../engine/microstates.js";
import { cloneState, markRecords, eventIcon, eventLabel } from "./helpers.js";
import { minsBetween, nowISO, uid, fmtClock } from "../utils/time.js";
import { SUBSTANCES } from "../data/catalogs.js";
/* =====================================================================
   MÓDULO: ui/flows.jsx  — Registro (rápido/moderado) y sueño
===================================================================== */
export function StateFlow(props){
  const api=props.api;
  const branch=props.branch;
  const b=STATE_BRANCHES.find(x=>x.id===branch);
  const qs=useMemo(()=>{
    if(branch==="bien"){
      const mb=ROUTES.momento_bueno.steps[0];
      const rot=GOOD_FOLLOWUPS[closedDays(api.S).length%GOOD_FOLLOWUPS.length];
      return [
        {id:"good_what",variable:"goodWhat",text:mb.q,options:mb.options},
        {id:"good_"+rot.v,variable:"good_"+rot.v,text:rot.q,options:rot.options}];
    }
    return selectQuestions(cloneState(api.S),{stateBranch:branch},3);
  },[]);
  function finish(answers,records){
    api.commit(n=>{
      markRecords(n,records,"state:"+branch);
      const answered=Object.keys(answers).length>0;
      addEvent(n,{ eventType:"state", subtype:branch,
        source: answered?"moderate":"quick",
        context:answers, inferred:inferFromAnswers(answers) });
    });
    api.toast("Estado guardado");
    api.closeModal();
  }
  useEffect(()=>{
    if(!qs.length){
      api.commit(n=>{ addEvent(n,{eventType:"state",subtype:branch}); });
      api.toast("Estado guardado"); api.closeModal();
    }
  },[]);
  if(!qs.length) return null;
  return (
    <Sheet title={"Estado · "+b.label} onClose={api.closeModal}>
      <QuestionRunner questions={qs} onFinish={finish} />
    </Sheet>
  );
}
export function PlaceFlow(props){
  const api=props.api;
  const [place,setPlace]=useState(null);
  const [qs,setQs]=useState([]);
  function choose(p){
    const sel=selectQuestions(cloneState(api.S),{place:p},3);
    setPlace(p); setQs(sel);
    if(!sel.length){
      api.commit(n=>{ addEvent(n,{eventType:"place",subtype:p}); });
      api.toast("Lugar: "+p); api.closeModal();
    }
  }
  function finish(answers,records){
    api.commit(n=>{
      markRecords(n,records,"place:"+place);
      addEvent(n,{ eventType:"place", subtype:place,
        source:Object.keys(answers).length?"moderate":"quick",
        context:answers, inferred:inferFromAnswers(answers) });
    });
    api.toast("Lugar: "+place); api.closeModal();
  }
  return (
    <Sheet title="¿Dónde estás?" onClose={api.closeModal}>
      {!place &&
        <div className="pillrow">
          {PLACES.map(p=><Chip key={p} label={p} onTap={()=>choose(p)} />)}
        </div>}
      {place && qs.length>0 && <QuestionRunner questions={qs} onFinish={finish} />}
    </Sheet>
  );
}
export function ExerciseFlow(props){
  const api=props.api;
  const [type,setType]=useState(null);
  function saveExercise(min){
    const ex=EXERCISES.find(x=>x.id===type);
    const kcal=Math.round(ex.kcalMin*min);
    api.commit(n=>{ addEvent(n,{eventType:"exercise",subtype:type,value:{min,kcal}}); });
    api.toast(ex.label+" · "+min+" min · -"+kcal+" kcal");
    api.closeModal();
  }
  function saveMicro(m){
    api.commit(n=>{ addEvent(n,{eventType:"microAction",subtype:m.id,value:{kcal:m.kcal}}); });
    api.toast(m.label+" · -"+m.kcal+" kcal");
  }
  return (
    <Sheet title="Ejercicio" onClose={api.closeModal}>
      {!type && <div>
        <div className="tiny" style={{marginBottom:8}}>Ejercicio formal</div>
        <div className="pillrow">
          {EXERCISES.map(x=><Chip key={x.id} label={x.label} onTap={()=>setType(x.id)} />)}
        </div>
        <div className="tiny" style={{margin:"18px 0 8px"}}>Microacciones · un toque registra</div>
        <div className="pillrow">
          {MICROACTIONS.map(m=><Chip key={m.id} label={m.label} onTap={()=>saveMicro(m)} />)}
        </div>
      </div>}
      {type && <div>
        <div className="qtitle">¿Cuántos minutos?</div>
        <div className="pillrow">
          {EX_DURATIONS.map(d=><Chip key={d} label={d+" min"} onTap={()=>saveExercise(d)} />)}
        </div>
      </div>}
    </Sheet>
  );
}
export function AlcoholSheet(props){
  const api=props.api;
  const [count,setCount]=useState(0);
  const lastId=useRef(null);
  function drink(t){
    const eid=uid(); lastId.current=eid;
    api.commit(n=>{ addEvent(n,{id:eid,eventType:"substance",subtype:"alcohol",
      value:{drink:t.id,kcal:t.kcal}}); });
    setCount(count+1);
    api.toast(t.label+" · +"+t.kcal+" kcal");
  }
  function done(){
    const total=substanceCountToday(api.S,"alcohol");
    api.closeModal();
    if(lastId.current && total>0 && total%3===0){
      api.openModal({kind:"substModerate", eventId:lastId.current});
    }
  }
  return (
    <Sheet title="Alcohol · ¿qué tomaste?" onClose={done}>
      <div className="pillrow">
        {ALCOHOL_TYPES.map(t=><Chip key={t.id} label={t.label} onTap={()=>drink(t)} />)}
      </div>
      <div className="muted" style={{margin:"14px 2px"}}>Cada toque registra una bebida.
        {count>0 && (" Registradas ahora: "+count+".")}</div>
      <button className="btn" style={{width:"100%"}} onClick={done}>Listo</button>
    </Sheet>
  );
}
export function SubstanceModerate(props){
  const api=props.api;
  const qs=useMemo(()=>selectQuestions(cloneState(api.S),{eventType:"substance"},3),[]);
  function finish(answers,records){
    api.commit(n=>{
      markRecords(n,records,"substance");
      patchEventContext(n, props.eventId, answers);
    });
    api.closeModal();
  }
  useEffect(()=>{ if(!qs.length) api.closeModal(); },[]);
  if(!qs.length) return null;
  return (
    <Sheet title="Un segundo…" onClose={api.closeModal}>
      <QuestionRunner questions={qs} onFinish={finish} />
    </Sheet>
  );
}
export function BodySheet(props){
  const api=props.api;
  function save(v){
    api.commit(n=>{ addEvent(n,{eventType:"body",subtype:v,context:{body:v}}); });
    api.toast("Cuerpo: "+BODY_LABEL[v]);
    api.closeModal();
  }
  return (
    <Sheet title="¿Cómo está tu cuerpo ahora?" onClose={api.closeModal}>
      <div className="pillrow">
        {BODY_OPTIONS.map(o=><Chip key={o[0]} label={o[1]} onTap={()=>save(o[0])} />)}
      </div>
      <p className="muted" style={{marginTop:12}}>Sólo registro. Sin juicio, sin intervención.</p>
    </Sheet>
  );
}
export function CartaCard(props){
  const c=props.content;
  return (
    <div className="card" style={{background:"#fbf8f1"}}>
      <div className="tiny" style={{marginBottom:6}}>{props.label}</div>
      {Object.values(c).map((line,i)=><p key={i} style={{margin:"6px 0",fontSize:14}}>{line}</p>)}
    </div>
  );
}
export function SleepSheet(props){
  const api=props.api;
  const [mode,setMode]=useState(null);
  const carta=useMemo(()=>{
    const c=cloneState(api.S);
    return buildCartaDiaria(c,getOpenDay(c));
  },[]);
  const [focus,setFocus]=useState(null);
  function sleepMain(){
    if((closedDays(api.S).length+1)%3===0) saveBackupRotating("cierre de 3 días lógicos");
    api.commit(n=>{
      if(focus) setFocusTomorrow(n,focus);
      const day=getOpenDay(n);
      const ct=buildCartaDiaria(n,day);
      n.cartas.push(ct);
      addEvent(n,{eventType:"carta",subtype:"daily",source:"system",value:ct.content});
      if(n.nappingId){
        const ns=n.sleepSessions.find(s=>s.id===n.nappingId);
        if(ns && !ns.endedAt){ ns.endedAt=nowISO();
          ns.durationMin=minsBetween(ns.startedAt,ns.endedAt); ns.incomplete=true; }
        n.nappingId=null;
      }
      n.snapshots.push(buildSnapshot(n,day));
      addEvent(n,{eventType:"sleep",subtype:"mainSleep"});
      const sess={id:uid(),type:"mainSleep",startedAt:nowISO()};
      n.sleepSessions.push(sess);
      n.sleepingId=sess.id;
      day.status="closed"; day.endedAt=nowISO();
      if(closedDays(n).length%3===0){
        const c3=buildCarta3(n);
        if(c3) n.cartas.push(c3);
      }
      evaluateOpenExperiments(n);
      promoteLaws(n);
    });
    api.toast("Día cerrado. Que descanses.");
    api.closeModal();
  }
  function sleepNap(){
    api.commit(n=>{
      const sess={id:uid(),type:"nap",startedAt:nowISO()};
      n.sleepSessions.push(sess);
      n.nappingId=sess.id;
      addEvent(n,{eventType:"nap",subtype:"start"});
    });
    api.toast("Siesta iniciada. El día sigue abierto.");
    api.closeModal();
  }
  return (
    <Sheet full={mode==="main"} title="Dormir" onClose={api.closeModal}
      onBack={mode==="main"?()=>setMode(null):null}>
      {!mode && <div className="pillrow">
        <Chip label="🌙 Sueño principal" onTap={()=>setMode("main")} />
        <Chip label="😴 Siesta" onTap={sleepNap} />
      </div>}
      {mode==="main" && <div>
        <CartaCard label="Carta del día" content={carta.content} />
        <div className="tiny" style={{margin:"14px 0 6px"}}>🎯 Mañana quiero observar:</div>
        <div className="pillrow">
          {FOCUS_OPTIONS.map(o=><Chip key={o[0]} label={o[1]} on={focus===o[0]}
            onTap={()=>setFocus(focus===o[0]?null:o[0])} />)}
        </div>
        <p className="muted" style={{margin:"4px 0 10px",fontSize:13}}>No es obligación; sólo un foco de observación.</p>
        <button className="btn" style={{width:"100%"}} onClick={sleepMain}>
          Cerrar día y dormir</button>
      </div>}
    </Sheet>
  );
}
export const WAKE_QUESTIONS=[
  { id:"wk_calidad", variable:"sleepQuality", text:"¿Cómo dormiste?",
    options:[["continuo","Continuo"],["pausado","Pausado"],["ligero","Ligero"],
      ["pesado","Pesado"],["bebe","Como bebé"],["mal","Mal"]] },
  { id:"wk_energia", variable:"wakeEnergy", text:"¿Con cuánta energía despiertas?",
    options:[["alta","Alta"],["media","Media"],["baja","Baja"],["agotado","Agotado"]] },
  { id:"wk_atencion", variable:"wakeAttention", text:"¿Dónde está tu atención al despertar?",
    options:[["presente","Presente"],["trabajo","Trabajo"],["mika","Mika"],
      ["pasado","Pasado"],["futuro","Futuro"],["no_se","No sé"]] },
];
export function WakeSheet(props){
  const api=props.api;
  const sleeping=!!api.S.sleepingId;
  function finishMain(answers){
    api.commit(n=>{
      const s=n.sleepSessions.find(x=>x.id===n.sleepingId);
      if(s){ s.endedAt=nowISO(); s.durationMin=minsBetween(s.startedAt,s.endedAt);
        s.quality=answers.sleepQuality||null; s.wakeEnergy=answers.wakeEnergy||null; }
      n.sleepingId=null;
      addEvent(n,{eventType:"wake",subtype:"mainSleep",context:answers});
    });
    api.toast("Buen día, "+USER_NAME+". Nuevo día lógico abierto.");
    api.closeModal();
  }
  function finishNap(v){
    api.commit(n=>{
      const s=n.sleepSessions.find(x=>x.id===n.nappingId);
      if(s){ s.endedAt=nowISO(); s.durationMin=minsBetween(s.startedAt,s.endedAt); s.helped=v; }
      n.nappingId=null;
      addEvent(n,{eventType:"wake",subtype:"nap",context:{helped:v}});
    });
    api.toast("Siesta registrada. Mismo día lógico.");
    api.closeModal();
  }
  return (
    <Sheet full={sleeping} title={sleeping?"Despertar":"Despertar de siesta"} onClose={api.closeModal}>
      {sleeping &&
        <QuestionRunner questions={WAKE_QUESTIONS} onFinish={a=>finishMain(a)} />}
      {!sleeping && <div>
        <div className="qtitle">¿Ayudó la siesta?</div>
        <div className="pillrow">
          <Chip label="Sí" onTap={()=>finishNap("yes")} />
          <Chip label="Parcial" onTap={()=>finishNap("partial")} />
          <Chip label="No" onTap={()=>finishNap("no")} />
        </div>
      </div>}
    </Sheet>
  );
}


export function EditEventSheet(props){
  const api=props.api; const S=api.S;
  const ev=S.events.find(e=>e.id===props.eventId);
  const [subtype,setSubtype]=useState(ev?ev.subtype:null);
  const [drink,setDrink]=useState(ev&&ev.context?ev.context.drink:null);
  const [place,setPlace]=useState(ev&&ev.context?ev.context.place:null);
  const [deltaMin,setDeltaMin]=useState(0);
  if(!ev) return null;
  const t=ev.eventType;
  function save(){
    saveBackupRotating("antes de corregir evento");
    api.commit(n=>{
      const patch={};
      if(subtype!==ev.subtype) patch.subtype=subtype;
      if(t==="substance"&&subtype==="alcohol"&&drink) patch.context={drink:drink};
      if(t==="place"&&place) patch.context={place:place};
      if(deltaMin!==0) patch.createdAt=new Date(new Date(ev.createdAt).getTime()+deltaMin*60000).toISOString();
      editEvent(n,ev.id,patch);
    });
    api.toast("Evento corregido (backup y recálculo hechos)");
    api.closeModal();
  }
  const newTime=new Date(new Date(ev.createdAt).getTime()+deltaMin*60000);
  return (
    <Sheet title="✏️ Corregir evento" onClose={api.closeModal}>
      <p className="muted" style={{marginBottom:8}}>{eventIcon(ev)} {eventLabel(ev)} · {fmtClock(ev.createdAt)}
        {ev.editCount?(" · corregido ×"+ev.editCount):""}</p>
      {t==="substance" && <div>
        <div className="tiny" style={{margin:"8px 0 6px"}}>Sustancia</div>
        <div className="pillrow">
          {SUBSTANCES.map(s2=><Chip key={s2.id} label={s2.emoji+" "+s2.label}
            on={subtype===s2.id} onTap={()=>setSubtype(s2.id)} />)}
        </div>
        {subtype==="alcohol" && <div>
          <div className="tiny" style={{margin:"8px 0 6px"}}>Tipo de bebida</div>
          <div className="pillrow">
            {ALCOHOL_TYPES.map(d=><Chip key={d.id} label={d.label}
              on={drink===d.id} onTap={()=>setDrink(d.id)} />)}
          </div>
        </div>}
      </div>}
      {t==="state" && <div>
        <div className="tiny" style={{margin:"8px 0 6px"}}>Estado</div>
        <div className="pillrow">
          {[["bien","🙂 Bien"],["neutral","😐 Neutral"],["dificil","😣 Difícil"]].map(o=>
            <Chip key={o[0]} label={o[1]} on={subtype===o[0]} onTap={()=>setSubtype(o[0])} />)}
        </div>
      </div>}
      {t==="body" && <div>
        <div className="tiny" style={{margin:"8px 0 6px"}}>Cuerpo</div>
        <div className="pillrow">
          {BODY_OPTIONS.map(o=><Chip key={o[0]} label={o[1]} on={subtype===o[0]} onTap={()=>setSubtype(o[0])} />)}
        </div>
      </div>}
      {t==="place" && <div>
        <div className="tiny" style={{margin:"8px 0 6px"}}>Lugar</div>
        <div className="pillrow">
          {PLACES.map(p=><Chip key={p} label={p} on={place===p} onTap={()=>setPlace(p)} />)}
        </div>
      </div>}
      {t==="exercise" && <div>
        <div className="tiny" style={{margin:"8px 0 6px"}}>Ejercicio</div>
        <div className="pillrow">
          {EXERCISES.map(x=><Chip key={x.id} label={x.label} on={subtype===x.id} onTap={()=>setSubtype(x.id)} />)}
        </div>
      </div>}
      <div className="tiny" style={{margin:"12px 0 6px"}}>Hora del evento</div>
      <div className="pillrow">
        {[-60,-30,-10,10,30,60].map(d=>
          <Chip key={d} label={(d>0?"+":"")+d+"m"} on={false} onTap={()=>setDeltaMin(deltaMin+d)} />)}
      </div>
      <p className="muted" style={{margin:"6px 0"}}>Nueva hora: {fmtClock(newTime.toISOString())}
        {deltaMin!==0?(" ("+(deltaMin>0?"+":"")+deltaMin+" min)"):""}</p>
      <button className="btn" style={{width:"100%",marginTop:10}} onClick={save}>Guardar corrección</button>
      <p className="muted" style={{marginTop:8,fontSize:13}}>
        Se conserva el evento original dentro del corregido. Hipótesis, confianza y snapshots se recalculan; nunca se editan a mano.</p>
    </Sheet>
  );
}
