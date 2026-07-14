import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import { ROUTES, SOS_DISCRIMINATOR, SOS_SECOND, routeFromDiscriminator,
  startIntervention, concludeIntervention, closeIntervention, markToolShown } from "../engine/clinicalRouter.js";
import { MUSCLES } from "../data/catalogs.js";
import { SOS_PHRASES } from "../data/interventions.js";
import { recordStyleAnswer, shouldAskStyle } from "../engine/coach.js";
import { pickInterventionFor, recordInterventionFeedback } from "../engine/director.js";
import { addEvent, patchEventContext } from "../engine/events.js";
import { Chip, Sheet } from "./atoms.jsx";
import { uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: ui/interventionsFlows.jsx — SOS, Resolver, Entrenar
===================================================================== */
export const SOS_FLOWS={
  activacion:{ label:"Bajar activación", phraseKey:"activacion", steps:[
    { key:"fact", title:"Nombra un hecho real. Solo lo verificable.",
      options:[["trabajo","Algo del trabajo"],["mika","Algo con Mika"],["salud","Algo de salud"],
        ["dinero","Algo de dinero"],["relacion","Algo de una relación"],["pendiente","Un pendiente"],["otro","Otro"]] },
    { key:"story", title:"Ahora la película mental. Nómbrala como película.",
      options:[["saldra_mal","Va a salir mal"],["no_podre","No voy a poder con todo"],
        ["deterioro","Se está deteriorando"],["juzgan","Me van a juzgar"],
        ["sin_solucion","No tiene solución"],["otra","Otra"]] },
    { key:"body", title:"Ubica el cuerpo. ¿Dónde vive esto?",
      options:[["pecho","Pecho"],["garganta","Garganta"],["mandibula","Mandíbula"],
        ["estomago","Estómago"],["cuello","Cuello"],["tension","Tensión general"]] },
    { key:"minAction", title:"Elige una acción mínima.",
      options:[["agua","Tomar agua"],["caminar","Caminar 2 min"],["respirar","Respirar 4-6, ocho ciclos"],
        ["estirar","Estirar cuello y hombros"],["aire","Salir al aire"],["nada","Nada todavía"]] } ] },
  rumiacion:{ label:"Salir de rumiación", phraseKey:"rumiacion", steps:[
    { key:"realVsSim", title:"¿Estás observando realidad o simulando futuros?",
      options:[["realidad","Observando realidad"],["simulando","Simulando futuros"],["no_se","No sé"]] },
    { key:"eliminating", title:"¿Qué intenta eliminar tu mente?",
      options:[["incertidumbre","Incertidumbre"],["culpa","Culpa"],["miedo","Miedo"],
        ["impotencia","Impotencia"],["soledad","Soledad"],["dolor_anticipado","Dolor anticipado"]] },
    { key:"needsAction", title:"¿Esto necesita acción ahora?",
      options:[["si","Sí"],["regular_primero","No, regular primero"],["no_se","No sé"]] } ] },
  impulso:{ label:"Frenar impulso", phraseKey:"impulso", steps:[
    { key:"impulse", title:"¿Qué impulso quiere mandar?",
      options:[["fumar","Fumar"],["revisar","Revisar"],["tomar","Tomar"],
        ["pensar_mas","Pensar más"],["escapar","Escapar"]] },
    { key:"wait2", title:"¿Qué pasa si esperas 2 minutos?",
      options:[["baja","Baja"],["sube","Sube"],["no_se","No sé"],["no_quiero","No quiero esperar"]] },
    { key:"minAction", title:"¿Qué opción mínima existe?",
      options:[["caminar","Caminar"],["agua","Agua"],["esperar","Esperar"],
        ["registrar","Registrar"],["llamar","Llamar"],["nada","No hacer nada todavía"]] } ] },
  hecho:{ label:"Separar hecho de historia", phraseKey:"hecho", steps:[
    { key:"fact", title:"El hecho. Corto y verificable.",
      options:[["trabajo","Algo del trabajo"],["mika","Algo con Mika"],["salud","Algo de salud"],
        ["dinero","Algo de dinero"],["relacion","Algo de una relación"],["otro","Otro"]] },
    { key:"story", title:"La historia que tu mente le agregó.",
      options:[["saldra_mal","Va a salir mal"],["no_podre","No voy a poder"],
        ["deterioro","Se está deteriorando"],["culpa_mia","Es mi culpa"],
        ["nunca_cambia","Nunca cambia"],["otra","Otra"]] },
    { key:"minAction", title:"Responde al hecho, no a la película.",
      options:[["accion_5min","Acción de 5 minutos"],["esperar","Esperar y regular"],
        ["hablar","Hablar con alguien"],["presente","Volver al presente"],
        ["nada","Nada por ahora, decidido"]] } ] },
};
const INTENSITY_OPTS=[["0","0"],["2","2"],["4","4"],["6","6"],["8","8"],["10","10"]];
function RouteRunner(props){
  const api=props.api; const route=ROUTES[props.routeKey];
  const [i,setI]=useState(0);
  const [answers,setAnswers]=useState({});
  const [phase,setPhase]=useState("steps"); // steps → conclude → outcome
  const [adult,setAdult]=useState(null);
  const [out,setOut]=useState({});
  const conclusion=useMemo(()=>phase!=="steps"?route.conclude(answers):null,[phase]);
  const st=route.steps[i];
  function pick(v){
    const a=Object.assign({},answers,{[st.v]:v});
    if(i+1<route.steps.length){ setAnswers(a); setI(i+1); }
    else { setAnswers(a); setPhase("conclude"); }
  }
  function chooseAdult(v,l){ setAdult({v,l}); setPhase("outcome"); }
  function finish(helped){
    const o={intensityAfter:out.intensityAfter!=null?parseInt(out.intensityAfter,10):null,
      perspectiveChanged:out.perspective==="si",behaviorChanged:out.behavior==="si",helped};
    api.commit(n=>{
      startIntervention(n,props.routeKey,Object.assign({},props.ctx,
        {intensity:answers.intensity?parseInt(answers.intensity,10):null}));
      concludeIntervention(n,answers,conclusion,adult?adult.v:"");
      markToolShown(n,props.routeKey);
      closeIntervention(n,o);
      // evento legado para detectores y latentes existentes (aditivo, no destruye RC3)
      const inferred={};
      if(["rumiacion","stop_rumination_loop"].includes(props.routeKey)) inferred.mechanisms=["rumiación"];
      if(props.routeKey.indexOf("impulso")===0) inferred.mechanisms=["compulsión / obediencia"];
      if(["incertidumbre_info","incertidumbre_sin_info"].includes(props.routeKey)) inferred.mechanisms=["incertidumbre"];
      addEvent(n,{eventType:"sos",subtype:props.routeKey,source:"deep",
        context:answers,inferred:Object.keys(inferred).length?inferred:undefined});
    });
    api.toast(helped==="worse"?"Registrado. Esa herramienta descansará si vuelve a estorbar.":"Registrado con resultado.");
    api.closeModal();
    if(shouldAskStyle(api.S, props.routeKey==="activacion_regular"))
      api.openModal({kind:"styleAsk"});
  }
  if(phase==="steps") return (
    <div>
      <div className="row" style={{marginBottom:4}}>
        {i>0?<button className="x" aria-label="Atrás" onClick={()=>setI(i-1)}>←</button>
          :<span className="headspace"></span>}
        <div className="progress" style={{flex:1,margin:"0 10px"}}>
          <i style={{width:((i+1)/(route.steps.length+2)*100)+"%"}}></i></div>
        <span className="muted" style={{fontSize:13}}>{route.emoji} {route.title}</span>
      </div>
      <div className="qtitle">{st.q}</div>
      <div className="pillrow">
        {st.options.map(o=><Chip key={o[0]} label={o[1]} on={answers[st.v]===o[0]} onTap={()=>pick(o[0])} />)}
      </div>
    </div>);
  if(phase==="conclude") return (
    <div>
      <div className="tiny" style={{marginBottom:8}}>{route.emoji} {route.title} · conclusión</div>
      <div className="epis"><span className="lvl">Hecho</span><p>{conclusion.hecho}</p></div>
      <div className="epis"><span className="lvl">Inferencia</span><p>{conclusion.inferencia}</p></div>
      {conclusion.lines.map((l,k)=><p key={k} style={{margin:"8px 0",fontWeight:600}}>{l}</p>)}
      <div className="tiny" style={{margin:"14px 0 6px"}}>Acción adulta</div>
      <div className="pillrow">
        {conclusion.adult.map(o=><Chip key={o[0]} label={o[1]} onTap={()=>chooseAdult(o[0],o[1])} />)}
        <Chip ghost label="Ninguna por ahora" onTap={()=>chooseAdult("ninguna","Ninguna por ahora")} />
      </div>
    </div>);
  return (
    <div>
      <div className="tiny" style={{marginBottom:8}}>¿Qué pasó con esto?</div>
      {answers.intensity!=null && <div>
        <p className="muted" style={{margin:"6px 0"}}>Intensidad ahora (antes: {answers.intensity}/10)</p>
        <div className="pillrow">
          {INTENSITY_OPTS.map(o=><Chip key={o[0]} label={o[1]} on={out.intensityAfter===o[0]}
            onTap={()=>setOut(Object.assign({},out,{intensityAfter:o[0]}))} />)}
        </div>
      </div>}
      <p className="muted" style={{margin:"10px 0 4px"}}>¿Cambió tu perspectiva?</p>
      <div className="pillrow">
        {[["si","Sí"],["no","No"]].map(o=><Chip key={o[0]} label={o[1]} on={out.perspective===o[0]}
          onTap={()=>setOut(Object.assign({},out,{perspective:o[0]}))} />)}
      </div>
      <p className="muted" style={{margin:"10px 0 4px"}}>¿Cambió tu conducta (aunque la intensidad siga)?</p>
      <div className="pillrow">
        {[["si","Sí"],["no","No"]].map(o=><Chip key={o[0]} label={o[1]} on={out.behavior===o[0]}
          onTap={()=>setOut(Object.assign({},out,{behavior:o[0]}))} />)}
      </div>
      <p className="muted" style={{margin:"10px 0 4px"}}>En conjunto, ¿te sirvió?</p>
      <div className="pillrow">
        <Chip label="Sí" onTap={()=>finish("yes")} />
        <Chip label="Parcial" onTap={()=>finish("partial")} />
        <Chip label="No" onTap={()=>finish("no")} />
        <Chip ghost label="Me hizo peor" onTap={()=>finish("worse")} />
      </div>
      <p className="muted" style={{marginTop:12,fontSize:13}}>
        Cambiar la conducta cuenta como aprendizaje aunque la intensidad no baje.</p>
    </div>);
}
export function SOSSheet(props){
  const api=props.api;
  const [first,setFirst]=useState(null);
  const [routeKey,setRouteKey]=useState(null);
  const second=first?SOS_SECOND[first]:null;
  function pickFirst(v){
    if(v==="corporal"||v==="difusa"){ setRouteKey(routeFromDiscriminator(v)); }
    else setFirst(v);
  }
  function pickSecond(v){ setRouteKey(routeFromDiscriminator(first,v)); }
  const ctx={dominantEmotion:first==="dolor"?"":undefined};
  return (
    <Sheet full title="SOS" onClose={api.closeModal}
      onBack={routeKey?null:(first?()=>setFirst(null):null)}>
      {!routeKey && !first && <div>
        <div className="qtitle">{SOS_DISCRIMINATOR.q}</div>
        <div className="pillrow">
          {SOS_DISCRIMINATOR.options.map(o=>
            <Chip key={o[0]} label={o[1]} onTap={()=>pickFirst(o[0])} />)}
        </div>
      </div>}
      {!routeKey && first && second && <div>
        <div className="qtitle">{second.q}</div>
        <div className="pillrow">
          {second.options.map(o=><Chip key={o[0]} label={o[1]} onTap={()=>pickSecond(o[0])} />)}
        </div>
      </div>}
      {routeKey && <RouteRunner api={api} routeKey={routeKey} ctx={ctx} />}
    </Sheet>
  );
}
export function ResolverSheet(props){
  const api=props.api;
  const [routeKey,setRouteKey]=useState(null);
  return (
    <Sheet full title="Resolver" onClose={api.closeModal}>
      {!routeKey && <div>
        <div className="qtitle">¿Cuál es la situación real?</div>
        <div className="pillrow">
          <Chip label="✅ Hay un hecho y puedo actuar hoy" onTap={()=>setRouteKey("accion_adulta")} />
          <Chip label="📌 Hay un hecho real que me preocupa" onTap={()=>setRouteKey("angustia_hecho_real")} />
          <Chip label="🌫️ Necesito una información" onTap={()=>setRouteKey("incertidumbre_info")} />
          <Chip ghost label="🎞️ En realidad es mental, no un hecho" onTap={()=>{api.closeModal();api.openModal({kind:"sos"});}} />
        </div>
      </div>}
      {routeKey && <RouteRunner api={api} routeKey={routeKey} ctx={{realityActionability:routeKey==="accion_adulta"?"accionable":"hecho_real"}} />}
    </Sheet>
  );
}
export function TrainSheet(props){
  const api=props.api;
  const [muscle,setMuscle]=useState(null);
  const [phase,setPhase]=useState("pick"); // pick, before, steps, after, helped, difficulty
  const [stepI,setStepI]=useState(0);
  const data=useRef({});
  const interv=muscle?pickInterventionFor(api.S,muscle):null;
  function chooseMuscle(m){ setMuscle(m); setPhase("before"); }
  function setBefore(v){ data.current.intensityBefore=v; setPhase("steps"); setStepI(0); }
  function nextStep(){
    if(stepI+1<interv.steps.length) setStepI(stepI+1);
    else setPhase("after");
  }
  function setAfter(v){ data.current.intensityAfter=v; setPhase("helped"); }
  function setHelped(v){ data.current.helped=v; setPhase("difficulty"); }
  function setDifficulty(v){
    data.current.difficulty=v;
    const d=data.current;
    api.commit(n=>{
      addEvent(n,{eventType:"training",subtype:muscle,source:"deep",
        value:{interventionId:interv.id},
        context:{intensityBefore:d.intensityBefore,intensityAfter:d.intensityAfter,
          helped:d.helped,difficulty:v}});
      recordInterventionFeedback(n, interv.title,
        d.helped==="si"?"si":d.helped==="parcial"?"parcial":"no");
    });
    api.toast("Entrenamiento guardado");
    api.closeModal();
    if(shouldAskStyle(api.S,false)) api.openModal({kind:"styleAsk"});
  }
  return (
    <Sheet full title="Entrenar" onClose={api.closeModal}
      onBack={phase!=="pick"?()=>{setPhase("pick");setMuscle(null);}:null}
      progress={phase==="steps"?(stepI+1)/interv.steps.length:null}>
      {phase==="pick" && <div>
        <div className="qtitle">¿Qué músculo entrenamos?</div>
        <div className="pillrow">
          {MUSCLES.map(m=><Chip key={m} label={m} onTap={()=>chooseMuscle(m)} />)}
        </div>
      </div>}
      {phase==="before" && <div>
        <div className="qtitle">{interv.title}</div>
        <p className="muted">Intensidad de lo que sientes ahora, del 1 al 5:</p>
        <div className="pillrow">
          {LEVELS.map(l=><Chip key={l} label={String(l)} onTap={()=>setBefore(l)} />)}
        </div>
      </div>}
      {phase==="steps" && <div>
        <div className="tiny" style={{marginBottom:6}}>Paso {stepI+1} de {interv.steps.length}</div>
        <div className="qtitle">{interv.steps[stepI]}</div>
        <button className="btn" style={{width:"100%",marginTop:10}} onClick={nextStep}>
          {stepI+1<interv.steps.length?"Siguiente":"Terminé"}</button>
      </div>}
      {phase==="after" && <div>
        <div className="qtitle">¿Intensidad ahora?</div>
        <div className="pillrow">
          {LEVELS.map(l=><Chip key={l} label={String(l)} onTap={()=>setAfter(l)} />)}
        </div>
      </div>}
      {phase==="helped" && <div>
        <div className="qtitle">¿Ayudó?</div>
        <div className="pillrow">
          <Chip label="Sí" onTap={()=>setHelped("si")} />
          <Chip label="Parcial" onTap={()=>setHelped("parcial")} />
          <Chip label="No" onTap={()=>setHelped("no")} />
        </div>
      </div>}
      {phase==="difficulty" && <div>
        <div className="qtitle">¿Qué tan difícil fue? 1 fácil · 5 muy difícil</div>
        <div className="pillrow">
          {LEVELS.map(l=><Chip key={l} label={String(l)} onTap={()=>setDifficulty(l)} />)}
        </div>
      </div>}
    </Sheet>
  );
}
export function StyleAskSheet(props){
  const api=props.api;
  function pick(v){
    api.commit(n=>{ recordStyleAnswer(n,v); });
    api.toast(v==="ok"?"Perfecto, sigo igual.":"Anotado. Iré ajustando el tono.");
    api.closeModal();
  }
  return (
    <Sheet title="Una pregunta rápida" onClose={()=>pick("skip")}>
      <div className="qtitle">¿Cómo te sirvió mejor que te hablara hoy?</div>
      <div className="pillrow">
        <Chip label="Directo" onTap={()=>pick("directo")} />
        <Chip label="Más amable" onTap={()=>pick("amable")} />
        <Chip label="Más técnico" onTap={()=>pick("tecnico")} />
        <Chip label="Así estuvo bien" onTap={()=>pick("ok")} />
      </div>
    </Sheet>
  );
}
export function ChangedSheet(props){
  const api=props.api;
  const opts=[["bajo_intensidad","Bajó intensidad"],["cambio_perspectiva","Cambió perspectiva"],
    ["cambio_conducta","Cambió conducta"],["no_cambio","No cambió nada"],["empeoro","Empeoró"]];
  function pick(v){
    api.commit(n=>{
      patchEventContext(n, props.eventId, {changed:v});
      recordInterventionFeedback(n, props.label,
        (v==="no_cambio"||v==="empeoro")?"no":"si");
    });
    api.toast("Registrado. El Director aprende de esto.");
    const fromPeak=props.label.indexOf("SOS · Bajar activación")===0;
    api.closeModal();
    if(shouldAskStyle(api.S, fromPeak)) api.openModal({kind:"styleAsk"});
  }
  return (
    <Sheet title="¿Qué cambió?" onClose={api.closeModal}>
      <div className="pillrow">
        {opts.map(o=><Chip key={o[0]} label={o[1]} onTap={()=>pick(o[0])} />)}
      </div>
    </Sheet>
  );
}

