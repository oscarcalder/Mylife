import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import { coachHomeLine } from "./engine/coach.js";
import { recalcAllHypotheses } from "./engine/director.js";
import { markInsightShown } from "./engine/insightsEngine.js";
import { getOpenDay } from "./engine/logicalDay.js";
import { verifyDerived } from "./engine/snapshots.js";
import { loadState, persist } from "./engine/storage.js";
import { AlcoholSheet, BodySheet, EditEventSheet, ExerciseFlow, PlaceFlow, SleepSheet, StateFlow, SubstanceModerate, WakeSheet } from "./ui/flows.jsx";
import { cloneState } from "./ui/helpers.js";
import { ChangedSheet, ResolverSheet, SOSSheet, StyleAskSheet, TrainSheet } from "./ui/interventionsFlows.jsx";
import { ClaridadScreen, ConfigScreen, DiagSheet, ExportSheet, HomeScreen, ImportSheet, OroScreen, PulsoScreen } from "./ui/screens.jsx";
import { openDayRO } from "./engine/logicalDay.js";
import { dateKey, fmtClock, nowISO } from "./utils/time.js";
/* =====================================================================
   MÓDULO: App.jsx
===================================================================== */
export const TABS=[["home","🏠","Home"],["pulso","💓","Pulso"],["claridad","🔍","Claridad"],
  ["oro","🏆","Oro"],["config","⚙️","Config"]];
function LawConfetti(props){
  return <div className="confetti" aria-hidden="true">
    {["📜","✨","🌿","✨","📜"].map((e,i)=>
      <span key={i} style={{animationDelay:(i*0.08)+"s"}}>{e}</span>)}
  </div>;
}
export function App(){
  const [S,setS]=useState(loadState);
  const [tab,setTab]=useState("home");
  const [modal,setModal]=useState(null);
  const [confetti,setConfetti]=useState(false);
  const lawsRef=useRef(0);
  useEffect(()=>{
    const n=(S.laws||[]).length;
    if(n>lawsRef.current&&n>0){ setConfetti(true); setTimeout(()=>setConfetti(false),1200); }
    lawsRef.current=n;
  },[S.laws?S.laws.length:0]);
  const [toastMsg,setToastMsg]=useState(null);
  const toastTimer=useRef(null);
  function toast(m){
    setToastMsg(m);
    clearTimeout(toastTimer.current);
    toastTimer.current=setTimeout(()=>setToastMsg(null),2200);
  }
  function commit(mut){
    setS(prev=>{ const n=cloneState(prev); mut(n); persist(n); return n; });
  }
  function replace(n){ persist(n); setS(n); }
  const api={S,commit,replace,toast,openModal:setModal,closeModal:()=>setModal(null),setTab};
  useEffect(()=>{
    if(!openDayRO(S) && !S.sleepingId){
      commit(n=>{ getOpenDay(n); verifyDerived(n); recalcAllHypotheses(n); });
    }
  },[S.logicalDays.length,S.sleepingId]);
  useEffect(()=>{
    if(!openDayRO(S)) return;
    const line=coachHomeLine(S);
    if(line.hypKey){
      const ih=(S.insightHistory||{})[line.hypKey];
      const today=dateKey(nowISO());
      if(!ih||ih.lastDay!==today){ commit(n=>{ markInsightShown(n,line.hypKey); }); }
    }
  },[S.events.length]);
  const sleepingNoDay = S.sleepingId && !openDayRO(S);
  const ready = openDayRO(S) || sleepingNoDay;
  const sess = S.sleepingId ? S.sleepSessions.find(x=>x.id===S.sleepingId) : null;
  let screen=null;
  if(sleepingNoDay){
    screen=(
      <div style={{paddingTop:60,textAlign:"center"}}>
        <div className="card" style={{padding:"36px 20px"}}>
          <div style={{fontSize:44}}>🌙</div>
          <h2 style={{margin:"10px 0 4px"}}>Sueño principal en curso</h2>
          <p className="muted">Desde las {sess?fmtClock(sess.startedAt):"—"}. El día lógico está cerrado.</p>
          <button className="btn" style={{marginTop:16}}
            onClick={()=>setModal({kind:"wake"})}>☀️ Despertar</button>
        </div>
      </div>);
  } else if(ready){
    if(tab==="home") screen=<HomeScreen api={api} />;
    if(tab==="pulso") screen=<PulsoScreen api={api} />;
    if(tab==="claridad") screen=<ClaridadScreen api={api} />;
    if(tab==="oro") screen=<OroScreen api={api} />;
    if(tab==="config") screen=<ConfigScreen api={api} />;
  }
  let modalEl=null;
  if(modal){
    if(modal.kind==="state") modalEl=<StateFlow api={api} branch={modal.branch} />;
    if(modal.kind==="place") modalEl=<PlaceFlow api={api} />;
    if(modal.kind==="exercise") modalEl=<ExerciseFlow api={api} />;
    if(modal.kind==="alcohol") modalEl=<AlcoholSheet api={api} />;
    if(modal.kind==="substModerate") modalEl=<SubstanceModerate api={api} eventId={modal.eventId} />;
    if(modal.kind==="sleep") modalEl=<SleepSheet api={api} />;
    if(modal.kind==="wake") modalEl=<WakeSheet api={api} />;
    if(modal.kind==="sos") modalEl=<SOSSheet api={api} />;
    if(modal.kind==="resolver") modalEl=<ResolverSheet api={api} />;
    if(modal.kind==="train") modalEl=<TrainSheet api={api} />;
    if(modal.kind==="changed") modalEl=<ChangedSheet api={api} eventId={modal.eventId} label={modal.label} />;
    if(modal.kind==="styleAsk") modalEl=<StyleAskSheet api={api} />;
    if(modal.kind==="body") modalEl=<BodySheet api={api} />;
    if(modal.kind==="edit") modalEl=<EditEventSheet api={api} eventId={modal.eventId} />;
    if(modal.kind==="exportS") modalEl=<ExportSheet api={api} />;
    if(modal.kind==="importS") modalEl=<ImportSheet api={api} />;
    if(modal.kind==="diagS") modalEl=<DiagSheet api={api} />;
  }
  return (
    <div>
      {screen}
      {modalEl}
      {confetti && <LawConfetti />}
      {toastMsg && <div className="toast">{toastMsg}</div>}
      {!sleepingNoDay &&
        <div className="nav">
          {TABS.map(t=>
            <button key={t[0]} className={tab===t[0]?"on":""} onClick={()=>setTab(t[0])}>
              <span className="ico">{t[1]}</span>{t[2]}</button>)}
        </div>}
    </div>
  );
}

