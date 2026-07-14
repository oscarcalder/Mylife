import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import { moodBalance, moodComparison, moodEmotions, moodDayparts, DAYPARTS, EMOTION_LABEL } from "../engine/moodStats.js";
import { nicotineDetail, alcoholDetail, motaDetail } from "../engine/substanceStats.js";
import { editedEventsCount } from "../engine/events.js";
import { openDayRO } from "../engine/logicalDay.js";
import { brainStatus } from "../engine/brainStatus.js";
import { nicotineRecords, toleranceRecords } from "../engine/substanceStats.js";
import { inferMicrostate, dayVectors, checkFocus } from "../engine/microstates.js";
import { BATTLES, computeBattle } from "../engine/battles.js";
import { BODY_LABEL, EXERCISES, NICOTINE_IDS, STATE_BRANCHES, SUBSTANCES } from "../data/catalogs.js";
import { OPTION_LABELS } from "../data/questionBank.js";
import { alcoholKcalOfDay, avgIntervalBetween, daySemaphore, exerciseKcalOfDay, lastEventOf, lastSubstanceUse, substanceCountToday, substanceEvents, timeSinceLastSubstance, workLeisureTotals } from "../engine/calculations.js";
import { coachHomeLine, coachLayers, styleLayers, styleOf } from "../engine/coach.js";
import { APP_VERSION, SCHEMA_VERSION, USER_NAME } from "../engine/config.js";
import { CONF_PREFIX, STATUS_LABEL, acceptExperiment, detectedMechanisms, recalcAllHypotheses, resolveExperiment, trendOfHypothesis } from "../engine/director.js";
import { addEvent, deleteEvent } from "../engine/events.js";
import { buildInsights, buildVictories, priorityOf } from "../engine/insightsEngine.js";
import { compositeSnapshot, latentSnapshot } from "../engine/latentVars.js";
import { closedDays, dayEvents, getOpenDay, logicalDayNumber } from "../engine/logicalDay.js";
import { EDGE_LABEL, NODE_LABELS, assocOfMetrics, buildRelationGraph, trendOfMetric } from "../engine/relationsAndTrends.js";
import { dayStats, rebuildDerived, snapshotOfDay } from "../engine/snapshots.js";
import { defaultState, deleteBackupKey, listBackups, migrateState, readBackupRaw, readMeta, saveBackupRotating } from "../engine/storage.js";
import { Chip, Sheet } from "./atoms.jsx";
import { copyText, eventIcon, eventLabel } from "./helpers.js";
import { dateKey, fmtClock, fmtDate, fmtDur, nowISO, timeAgo, uid } from "../utils/time.js";
/* =====================================================================
   MÓDULO: ui/screens.jsx
===================================================================== */

export function HomeScreen(props){
  const api=props.api; const S=api.S;
  const day=openDayRO(S);
  const lastState=lastEventOf(S,"state");
  const lastPlace=lastEventOf(S,"place");
  const lastEx=lastEventOf(S,"exercise");
  const allIds=SUBSTANCES.map(s=>s.id);
  const lastCons=lastSubstanceUse(S,allIds);
  const wl=workLeisureTotals(S,day.id);
  const coach=coachHomeLine(S);
  const weekEx=S.events.filter(e=>e.eventType==="exercise"
    && (Date.now()-new Date(e.createdAt).getTime())<7*86400000).length;
  function tapSubstance(s){
    if(s.id==="alcohol"){ api.openModal({kind:"alcohol"}); return; }
    const eid=uid();
    api.commit(n=>{ addEvent(n,{id:eid,eventType:"substance",subtype:s.id}); });
    api.toast(s.label+" registrado");
    const newCount=substanceCountToday(S,s.id)+1;
    if(newCount%4===2) api.openModal({kind:"substModerate", eventId:eid});
  }
  function toggle(kind){
    api.commit(n=>{
      const d=getOpenDay(n);
      const cur=workLeisureTotals(n,d.id);
      if(cur.active===kind){ addEvent(n,{eventType:kind,value:"stop"}); }
      else {
        if(cur.active) addEvent(n,{eventType:cur.active,value:"stop"});
        addEvent(n,{eventType:kind,value:"start"});
      }
    });
  }
  function stateLabel(){
    if(!lastState) return "—";
    const emo=lastState.context&&lastState.context.emotion;
    if(emo) return OPTION_LABELS[emo]||emo;
    const b=STATE_BRANCHES.find(x=>x.id===lastState.subtype);
    return b?b.label:"—";
  }
  return (
    <div>
      {/* 1. Header */}
      <div className="header">
        <div>
          <div className="row" style={{gap:6,alignItems:"baseline"}}>
            <h2 style={{fontSize:21}}>MyLife</h2>
            <span className="tiny">v{APP_VERSION}</span>
          </div>
          <div className="muted">{USER_NAME} · Día lógico #{logicalDayNumber(S)} · {fmtDate(nowISO())}</div>
        </div>
        <div className="row" style={{gap:8}}>
          <button className="sleepbtn" onClick={()=>{
            if(S.sleepingId){ api.toast("Ya hay sueño principal en curso."); return; }
            api.openModal({kind:"sleep"});
          }} aria-label="Dormir">🌙</button>
          <button className="sleepbtn" onClick={()=>{
            if(S.sleepingId||S.nappingId) api.openModal({kind:"wake"});
            else api.toast("No hay sueño activo.");
          }} aria-label="Despertar">☀️</button>
        </div>
      </div>
      {S.nappingId &&
        <div className="card" style={{background:"#eef0f6"}}>
          <span className="muted">😴 Siesta en curso · toca ☀️ al despertar. El día sigue abierto.</span>
        </div>}
      {/* 2. Pulso compacto */}
      <div className="card tap" onClick={()=>api.setTab("pulso")}>
        <div className="row between">
          <div>
            <div style={{fontWeight:700}}>{daySemaphore(S)} {stateLabel()} · {lastPlace?lastPlace.subtype:"Sin lugar"}</div>
            <div className="muted" style={{marginTop:2}}>
              Nicotina {substanceEvents(S,NICOTINE_IDS,day.id).length} ·
              Alcohol {substanceCountToday(S,"alcohol")} ·
              Último consumo: {lastCons?timeAgo(lastCons.createdAt):"—"}
            </div>
          </div>
          <span className="muted">›</span>
        </div>
        <div className="row" style={{marginTop:8}}
          onClick={e=>{e.stopPropagation(); api.openModal({kind:"body"});}}>
          <span className="chip" role="button" aria-label="Registrar estado corporal">
            🫀 Cuerpo: {(function(){ const b=lastEventOf(S,"body");
              return b?BODY_LABEL[b.subtype]||b.subtype:"Sin dato"; })()}</span>
        </div>
      </div>
      {/* 3. Lugar + Ejercicio */}
      <div className="grid2">
        <div className="card tap" style={{margin:0}} onClick={()=>api.openModal({kind:"place"})}>
          <div className="tiny">Lugar</div>
          <div style={{fontWeight:700,marginTop:2}}>{lastPlace?lastPlace.subtype:"Sin registrar"}</div>
          <div className="muted">{lastPlace?("desde "+timeAgo(lastPlace.createdAt).replace("hace ","hace ")):"toca para elegir"}</div>
        </div>
        <div className="card tap" style={{margin:0}} onClick={()=>api.openModal({kind:"exercise"})}>
          <div className="tiny">Ejercicio</div>
          <div style={{fontWeight:700,marginTop:2}}>
            {lastEx?(EXERCISES.find(x=>x.id===lastEx.subtype)||{label:lastEx.subtype}).label:"Sin registrar"}
          </div>
          <div className="muted">{lastEx?timeAgo(lastEx.createdAt):"toca para registrar"} · {weekEx}/sem</div>
        </div>
      </div>
      {/* 4. Estado actual */}
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>¿Cómo estás?</div>
        <div className="row" style={{gap:8}}>
          {STATE_BRANCHES.map(b=>
            <button key={b.id} className="chip" style={{flex:1,background:b.bg,padding:"12px 8px"}}
              onClick={()=>api.openModal({kind:"state",branch:b.id})}>
              {b.emoji} {b.label}</button>)}
        </div>
        {lastState &&
          <div className="muted" style={{marginTop:8}}>
            Último: {stateLabel()} · {timeAgo(lastState.createdAt)}</div>}
      </div>
      {/* 5. Sustancias rápidas */}
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Sustancias · un toque registra</div>
        <div className="row" style={{gap:6}}>
          {SUBSTANCES.map(s=>{
            const last=lastSubstanceUse(S,[s.id]);
            return (
              <button key={s.id} className="subst" style={{background:s.bg}} aria-label={"Registrar "+s.label}
                onClick={()=>tapSubstance(s)}>
                <span className="em">{s.emoji}</span>
                <span className="n">{substanceCountToday(S,s.id)}</span>
                <span className="last">{last?timeAgo(last.createdAt).replace("hace ",""):"—"}</span>
              </button>);
          })}
        </div>
      </div>
      {/* 6. Coach breve */}
      <div className="card tap" onClick={()=>api.setTab("claridad")}>
        <div className="row" style={{alignItems:"flex-start"}}>
          <div className="coachdot"></div>
          <div>
            <div style={{fontSize:14}}>{coach.text}</div>
            {(function(){ const fc=checkFocus(S);
              return fc?<div style={{fontSize:14,fontWeight:600,marginTop:6}}>{fc.text}</div>:null; })()}
          </div>
        </div>
      </div>
      {/* 7. Trabajo / Ocio */}
      <div className="grid2">
        <div className="card tap" style={{margin:0,background:wl.active==="work"?"#e8efe9":"#fff"}}
          onClick={()=>toggle("work")}>
          <div className="tiny">Trabajo {wl.active==="work"?"· ● activo":""}</div>
          <div className="big">{fmtDur(wl.totals.work)}</div>
        </div>
        <div className="card tap" style={{margin:0,background:wl.active==="leisure"?"#eeeaf3":"#fff"}}
          onClick={()=>toggle("leisure")}>
          <div className="tiny">Ocio {wl.active==="leisure"?"· ● activo":""}</div>
          <div className="big">{fmtDur(wl.totals.leisure)}</div>
        </div>
      </div>
      {/* 8. Accesos */}
      <div className="row" style={{gap:10}}>
        <button className="btnbig" style={{background:"var(--rose)"}}
          onClick={()=>api.openModal({kind:"sos"})}>🆘 SOS</button>
        <button className="btnbig" style={{background:"var(--sky)"}}
          onClick={()=>api.openModal({kind:"resolver"})}>🧭 Resolver</button>
        <button className="btnbig" style={{background:"var(--sage-d)"}}
          onClick={()=>api.openModal({kind:"train"})}>🏋️ Entrenar</button>
      </div>
    </div>
  );
}

export const HIST_VARS=[["nicotina","Nicotina"],["alcohol","Alcohol"],["mota","Mota"],
  ["ejercicio","Ejercicio"],["estado","🙂 Estado"],["sueno","Sueño"]];
export const HIST_RANGES=[[7,"7 días"],[14,"14 días"],[30,"30 días"],[0,"Todo"]];

export function EstadoPanel(props){
  const S=props.S; const dayIds=props.dayIds; const prevIds=props.prevIds;
  const [view,setView]=useState("balance");
  const bal=moodBalance(S,dayIds);
  const cmp=moodComparison(S,dayIds,prevIds);
  const emos=moodEmotions(S,dayIds);
  const dps=moodDayparts(S,dayIds);
  const DPL={}; DAYPARTS.forEach(p=>{DPL[p.id]=p.label;});
  return (
    <div style={{marginTop:10}}>
      <div className="pillrow" style={{marginBottom:8}}>
        {[["balance","Balance"],["emociones","Emociones"],["horario","Horario"]].map(v=>
          <Chip key={v[0]} label={v[1]} on={view===v[0]} onTap={()=>setView(v[0])} />)}
      </div>
      {bal.n===0 && <p className="muted">Aún no hay registros de estado en este periodo.</p>}
      {bal.n>0 && view==="balance" && <div>
        <div className="kv"><span className="muted">🙂 Bien</span><b>{bal.totals.bien}</b></div>
        <div className="kv"><span className="muted">😐 Neutral</span><b>{bal.totals.neutral}</b></div>
        <div className="kv"><span className="muted">😣 Difícil</span><b>{bal.totals.dificil}</b></div>
        <div className="kv"><span className="muted">Predominante</span>
          <b>{bal.dominante?(EMOTION_LABEL[bal.dominante]||bal.dominante):"—"}</b></div>
        <p className="muted" style={{marginTop:6}}>{cmp.ok?cmp.phrase:cmp.msg}</p>
      </div>}
      {bal.n>0 && view==="emociones" && <div>
        {emos.length===0 && <p className="muted">Sin emociones nombradas en este periodo.</p>}
        {emos.map(e=>
          <div key={e.key} className="kv"><span className="muted">{e.label}</span><b>{e.n}</b></div>)}
      </div>}
      {bal.n>0 && view==="horario" && <div>
        {DAYPARTS.map(p=>{
          const x=dps.parts[p.id];
          return <div key={p.id} className="kv"><span className="muted">{p.label}</span>
            <b>🙂{x.bien} 😐{x.neutral} 😣{x.dificil}</b></div>;})}
        <div className="kv"><span className="muted">Mayor bienestar</span>
          <b>{dps.best?DPL[dps.best]:"—"}</b></div>
        <div className="kv"><span className="muted">Más difícil</span>
          <b>{dps.worst?DPL[dps.worst]:"—"}</b></div>
        <p className="muted" style={{marginTop:6}}>
          {dps.n} observaciones · evidencia {dps.evidence}.
          {dps.evidence!=="sólida"?" Todavía no afirmo patrones de horario.":""}</p>
      </div>}
    </div>
  );
}
export function SubstPanel(props){
  const S=props.S; const dayIds=props.dayIds; const kind=props.kind;
  const [view,setView]=useState("cantidad");
  const DPL={}; DAYPARTS.forEach(p=>{DPL[p.id]=p.label;});
  const d = kind==="nicotina"?nicotineDetail(S,dayIds)
    : kind==="alcohol"?alcoholDetail(S,dayIds) : motaDetail(S,dayIds);
  if(d.n===0) return <p className="muted" style={{marginTop:10}}>Sin registros de {kind} en este periodo.</p>;
  const fm=m=>m==null?"—":(m>=60?Math.floor(m/60)+"h "+(m%60)+"m":m+"m");
  return (
    <div style={{marginTop:10}}>
      <div className="pillrow" style={{marginBottom:8}}>
        {[["cantidad","Cantidad"],["horario","Horario"],["intervalos","Intervalos"]].map(v=>
          <Chip key={v[0]} label={v[1]} on={view===v[0]} onTap={()=>setView(v[0])} />)}
      </div>
      {view==="cantidad" && kind==="nicotina" && <div>
        <div className="kv"><span className="muted">Cigarro</span><b>{d.cig}</b></div>
        <div className="kv"><span className="muted">IQOS</span><b>{d.iqos}</b></div>
        <div className="kv"><span className="muted">Total nicotina</span><b>{d.total}</b></div>
        <div className="kv"><span className="muted">Promedio por día</span><b>{d.perDayAvg}</b></div>
      </div>}
      {view==="cantidad" && kind==="alcohol" && <div>
        <div className="kv"><span className="muted">Bebidas</span><b>{d.total}</b></div>
        {Object.keys(d.types).map(t=>
          <div key={t} className="kv"><span className="muted">· {t}</span><b>{d.types[t]}</b></div>)}
        <div className="kv"><span className="muted">Calorías aprox.</span><b>+{d.kcal} kcal</b></div>
        <div className="kv"><span className="muted">Balance vs movimiento</span>
          <b>{d.balance>=0?"−":"+"}{Math.abs(d.balance)} kcal</b></div>
      </div>}
      {view==="cantidad" && kind==="mota" && <div>
        <div className="kv"><span className="muted">Usos</span><b>{d.total}</b></div>
        <div className="kv"><span className="muted">Cerca de estados difíciles (±90m)</span><b>{d.nearDifficult}</b></div>
        <div className="kv"><span className="muted">Cerca de momentos buenos (±90m)</span><b>{d.nearGood}</b></div>
        <div className="kv"><span className="muted">Cerca de fantasía/futuro imaginado</span><b>{d.nearFantasy}</b></div>
        <div className="kv"><span className="muted">Cerca de evasión</span><b>{d.nearAvoid}</b></div>
        <div className="kv"><span className="muted">Cerca de rumiación</span><b>{d.nearRumination}</b></div>
        <p className="muted" style={{marginTop:6}}>Cercanía temporal = asociación, no causa.</p>
      </div>}
      {view==="horario" && <div>
        {DAYPARTS.map(p=>
          <div key={p.id} className="kv"><span className="muted">{DPL[p.id]}</span>
            <b>{d.daypart.counts[p.id]}</b></div>)}
        <div className="kv"><span className="muted">Franja predominante</span>
          <b>{d.daypart.top?DPL[d.daypart.top]:"—"}</b></div>
        {kind==="nicotina" && d.peakHour!=null &&
          <div className="kv"><span className="muted">Hora más frecuente</span><b>{d.peakHour}:00</b></div>}
      </div>}
      {view==="intervalos" && kind==="nicotina" && <div>
        {(function(){ const r=nicotineRecords(S);
          return <div>
            <div className="kv"><span className="muted">🏆 Mejor intervalo histórico</span>
              <b>{r.bestInterval!=null?fm(r.bestInterval):"—"}{r.bestAt?(" · "+fmtDate(r.bestAt)):""}</b></div>
            <div className="kv"><span className="muted">Sin nicotina ahora mismo</span>
              <b>{r.currentGap!=null?fm(r.currentGap):"—"}</b></div>
          </div>; })()}
        <div className="kv"><span className="muted">Despertar → primera nicotina</span><b>{fm(d.wakeToFirstAvg)}</b></div>
        <div className="kv"><span className="muted">Última nicotina → dormir</span><b>{fm(d.lastToSleepAvg)}</b></div>
        <div className="kv"><span className="muted">Intervalo promedio</span><b>{fm(d.intervalAvg)}</b></div>
        <div className="kv"><span className="muted">Mejor intervalo</span><b>{fm(d.intervalBest)}</b></div>
        <div className="kv"><span className="muted">Intervalo más corto</span><b>{fm(d.intervalWorst)}</b></div>
      </div>}
      {view==="intervalos" && kind==="alcohol" && <div>
        <div className="kv"><span className="muted">Duración típica del episodio</span><b>{fm(d.episodeAvgMin)}</b></div>
        <div className="kv"><span className="muted">Última bebida → dormir</span><b>{fm(d.toSleepAvg)}</b></div>
        <div className="kv"><span className="muted">Cerca de ejercicio (±3h)</span><b>{d.nearExercise}</b></div>
        <div className="kv"><span className="muted">Cerca de estados difíciles (±3h)</span><b>{d.nearDifficult}</b></div>
      </div>}
      {view==="intervalos" && kind==="mota" && <div>
        <div className="kv"><span className="muted">Intervalo entre usos</span><b>{fm(d.intervalAvg)}</b></div>
        <div className="kv"><span className="muted">Último uso → dormir</span><b>{fm(d.toSleepAvg)}</b></div>
      </div>}
    </div>
  );
}
export function HistorialBlock(props){
  const api=props.api; const S=api.S;
  const [variable,setVariable]=useState("nicotina");
  const [range,setRange]=useState(7);
  const [sel,setSel]=useState(null);
  const [tm,setTm]=useState("hoy");
  function valueOfDay(d){
    const s=dayStats(S,d.id);
    if(variable==="nicotina") return s.nic;
    if(variable==="alcohol") return s.alc;
    if(variable==="mota") return s.mota;
    if(variable==="ejercicio") return s.exKcal;
    if(variable==="estado") return s.dificil;
    return 0;
  }
  let rangeDays=S.logicalDays.slice();
  if(range) rangeDays=rangeDays.slice(-range);
  const rangeIds=rangeDays.map(d=>d.id);
  const prevIds=(function(){ const all=S.logicalDays.slice();
    if(!range) return [];
    return all.slice(-(range*2),-range).map(d=>d.id); })();
  let bars=[];
  if(variable==="sueno"){
    let sess=S.sleepSessions.filter(s=>s.type==="mainSleep"&&s.durationMin);
    if(range) sess=sess.slice(-range);
    bars=sess.map(s=>({label:fmtDate(s.startedAt),value:Math.round(s.durationMin/6)/10}));
  } else {
    let days=S.logicalDays.slice();
    if(range) days=days.slice(-range);
    bars=days.map(d=>({label:fmtDate(d.startedAt),value:valueOfDay(d),day:d}));
  }
  const vals=bars.map(b=>b.value);
  const max=Math.max.apply(null,vals.concat([1]));
  const avg=vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10:0;
  const ins=buildInsights(S);
  const selDay=sel!=null&&bars[sel]?bars[sel].day:null;
  const snap=selDay?snapshotOfDay(S,selDay.id):null;
  const selStats=selDay?dayStats(S,selDay.id):null;
  return (
    <div className="card">
      <div className="tiny" style={{marginBottom:8}}>📊 Gráficas e historial</div>
      <div className="pillrow" style={{marginBottom:6}}>
        {HIST_VARS.map(v=><Chip key={v[0]} label={v[1]} on={variable===v[0]}
          onTap={()=>{setVariable(v[0]);setSel(null);}} />)}
      </div>
      <div className="pillrow">
        {HIST_RANGES.map(r=><Chip key={r[0]} label={r[1]} on={range===r[0]}
          onTap={()=>{setRange(r[0]);setSel(null);}} />)}
      </div>
      {variable==="estado" &&
        <EstadoPanel S={S} dayIds={rangeIds} prevIds={prevIds} />}
      {["nicotina","alcohol","mota"].includes(variable) &&
        <SubstPanel S={S} dayIds={rangeIds} kind={variable} />}
      {variable!=="estado" && bars.length===0 &&
        <p className="muted" style={{marginTop:12}}>Aún no hay datos aquí. Se llenará solo con tus días.</p>}
      {variable!=="estado" && bars.length>0 && <div>
        <div className="bar">
          {bars.map((b,i)=>
            <div key={i} className={"b"+(sel===i?" sel":"")}
              style={{height:Math.max(4,b.value/max*100)+"%"}}
              onClick={()=>{setSel(sel===i?null:i);setTm(snapshotOfDay(S,(b.day||{}).id)?"ese_dia":"hoy");}}></div>)}
        </div>
        <div className="row between muted" style={{fontSize:12}}>
          <span>Promedio: {avg}</span>
          <span>Máximo: {Math.max.apply(null,vals)}</span>
          <span>{bars.length} {variable==="sueno"?"noches":"días"}</span>
        </div>
        {sel!=null && bars[sel] && <div style={{marginTop:10,background:"#f7f5ef",borderRadius:14,padding:"10px 12px"}}>
          <div className="row between">
            <div style={{fontWeight:700}}>{bars[sel].label} · {bars[sel].value}{variable==="sueno"?" h":""}</div>
            {selDay && snap && <div className="row" style={{gap:6}}>
              <Chip label="Ese día" on={tm==="ese_dia"} onTap={()=>setTm("ese_dia")} />
              <Chip label="Hoy" on={tm==="hoy"} onTap={()=>setTm("hoy")} />
            </div>}
          </div>
          {selDay && snap && tm==="ese_dia" && <div style={{marginTop:8}}>
            <div className="tiny" style={{marginBottom:4}}>Máquina del tiempo · lo que el sistema sabía al cerrar ese día</div>
            <p style={{margin:"4px 0",fontSize:13}}>💬 {snap.coachLine}</p>
            {snap.hypotheses.length>0 && (function(){
              const top=snap.hypotheses.slice().sort((a,b)=>b.confidence-a.confidence)[0];
              return <p className="muted" style={{margin:"4px 0",fontSize:13}}>
                🧠 Director: {top.title} ({STATUS_LABEL[top.status]} · {top.confidence}%)</p>;
            })()}
            {snap.latents.length>0 && <div className="pillrow" style={{marginTop:6}}>
              {snap.latents.slice(0,4).map(l=><span key={l.key} className="chip"
                style={{cursor:"default",fontSize:12}}>{l.label} · {l.value}</span>)}
            </div>}
            <p className="muted" style={{margin:"6px 0 0",fontSize:12}}>
              {snap.stats.emotion?("Emoción: "+snap.stats.emotion+" · "):""}
              {snap.stats.wakeEnergy?("Energía: "+snap.stats.wakeEnergy+" · "):""}
              {snap.stats.sleepMin!=null?("Sueño: "+fmtDur(snap.stats.sleepMin)+" · "):""}
              Nicotina {snap.stats.nic} · Alcohol {snap.stats.alc}
              {snap.experimentsActive.length?(" · 🧪 "+snap.experimentsActive[0]):""}
            </p>
          </div>}
          {selDay && (!snap||tm==="hoy") && <div style={{marginTop:8}}>
            {!snap && <div className="tiny" style={{marginBottom:4}}>
              Día sin snapshot (previo a RC3): reconstrucción desde eventos</div>}
            {snap && <div className="tiny" style={{marginBottom:4}}>Qué entiendo hoy sobre ese día</div>}
            <div className="muted" style={{fontSize:13}}>
              Nicotina {selStats.nic} · Alcohol {selStats.alc} · Ejercicio {selStats.exKcal} kcal
              {selStats.emotion?(" · Predominó "+selStats.emotion):""}
              {selStats.sleepMin!=null?(" · Sueño "+fmtDur(selStats.sleepMin)):""}
            </div>
            <div className="muted" style={{marginTop:4,fontStyle:"italic",fontSize:13}}>
              Director hoy: {ins.primary?(CONF_PREFIX[ins.primary.h.status]+ins.primary.h.title+"."):
                ins.silenced?"sin patrón prioritario.":"sigo observando."}
            </div>
          </div>}
          {!selDay && <div className="muted" style={{marginTop:6,fontSize:13}}>
            Detalle disponible al seleccionar días (no noches de sueño).</div>}
        </div>}
      </div>}
    </div>
  );
}
export function PulsoScreen(props){
  const api=props.api; const S=api.S;
  const day=openDayRO(S);
  const evLen=S.events.length;
  const microstate=useMemo(()=>inferMicrostate(S),[evLen]);
  const vectors=useMemo(()=>dayVectors(S,day?day.id:null),[evLen,day&&day.id]);
  const [openCarta,setOpenCarta]=useState(null);
  const evs=dayEvents(S,day.id).filter(e=>e.eventType!=="carta").slice().reverse();
  const lastCons=lastSubstanceUse(S,SUBSTANCES.map(s=>s.id));
  const avgNic=avgIntervalBetween(S,NICOTINE_IDS,7);
  const alcK=alcoholKcalOfDay(S,day.id);
  const exK=exerciseKcalOfDay(S,day.id);
  const saldo=exK-alcK;
  const dailies=S.cartas.filter(c=>c.type==="daily").slice(-7).reverse();
  return (
    <div>
      <h2 style={{margin:"6px 2px 12px"}}>Pulso</h2>
      {(function(){ const ms=microstate;
        if(!ms) return null;
        return <div className="card" onClick={()=>api.toast(ms.explain)} style={{cursor:"pointer"}}>
          <div className="row between">
            <div style={{fontWeight:700}}>{ms.emoji} {ms.label}</div>
            <span className="muted" style={{fontSize:13}}>tocar = por qué</span>
          </div>
          <p className="muted" style={{margin:"6px 0 0",fontSize:14}}>{ms.explain}</p>
          <p className="muted" style={{margin:"4px 0 0",fontSize:12}}>Un estado del momento, no una identidad. Desaparece al cambiar la secuencia.</p>
        </div>; })()}
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>💓 Hoy</div>
        <div className="kv"><span className="muted">Nicotina</span>
          <b>{substanceEvents(S,NICOTINE_IDS,day.id).length}
            <span className="muted"> (cig {substanceCountToday(S,"cigarro")} · IQOS {substanceCountToday(S,"iqos")})</span></b></div>
        <div className="kv"><span className="muted">Alcohol</span>
          <b>{substanceCountToday(S,"alcohol")} · {alcK} kcal</b></div>
        <div className="kv"><span className="muted">Mota</span><b>{substanceCountToday(S,"mota")}</b></div>
        <div className="kv"><span className="muted">Último consumo</span>
          <b>{lastCons?timeAgo(lastCons.createdAt):"—"}</b></div>
        <div className="kv"><span className="muted">Promedio entre nicotina (7d)</span>
          <b>{fmtDur(avgNic)}</b></div>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>⚖️ Balance de hoy</div>
        <div className="kv"><span className="muted">Alcohol</span><b>+{alcK} kcal</b></div>
        <div className="kv"><span className="muted">Ejercicio y microacciones</span><b>−{exK} kcal</b></div>
        <div className="kv"><span className="muted">Saldo</span>
          <b style={{color:saldo>=0?"var(--ok)":"var(--bad)"}}>{saldo>=0?"−":"+"}{Math.abs(saldo)} kcal</b></div>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>🕒 Película del día</div>
        {evs.length===0 &&
          <p className="muted">Aún no hay eventos hoy. Vive tu día; la app aprende.</p>}
        {evs.map(e=>
          <div key={e.id} className="evline">
            <span className="muted" style={{width:52}}>{fmtClock(e.createdAt)}</span>
            <span>{eventIcon(e)}</span>
            <span>{eventLabel(e)}</span>
          </div>)}
      </div>
      {(function(){ const dv=vectors;
        if(!dv||!dv.ok) return null;
        return <div className="card">
          <div className="tiny" style={{marginBottom:6}}>🧭 Vectores del día</div>
          {dv.vectors.map(v=>
            <div key={v.key} style={{margin:"6px 0"}}>
              <div className="row between"><span>{v.emoji} {v.label}</span><b>{v.pct}%</b></div>
              <div style={{height:8,borderRadius:6,background:"#eceae3",marginTop:3}}>
                <div style={{height:8,borderRadius:6,width:v.pct+"%",background:"var(--sage-d)"}}></div></div>
              {v.pct>0 && <div className="muted" style={{fontSize:12,marginTop:2}}>{v.from}</div>}
            </div>)}
          <p className="muted" style={{marginTop:6,fontSize:12}}>{dv.n} eventos clasificados. Pueden coexistir.</p>
        </div>; })()}
      <HistorialBlock api={api} />
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>✉️ Cartas diarias recientes</div>
        {dailies.length===0 && <p className="muted">La primera carta nace al cerrar tu primer día con 🌙.</p>}
        {dailies.map(c=>
          <div key={c.id} className="evline" style={{cursor:"pointer",display:"block"}}
            onClick={()=>setOpenCarta(openCarta===c.id?null:c.id)}>
            <div style={{fontWeight:600}}>✉️ {fmtDate(c.createdAt)}</div>
            {openCarta===c.id &&
              Object.values(c.content).map((l,i)=><p key={i} className="muted" style={{margin:"6px 0"}}>{l}</p>)}
          </div>)}
        <p className="muted" style={{marginTop:6,fontSize:13}}>El histórico completo y las cartas de 3 días viven en Oro.</p>
      </div>
    </div>
  );
}
export function ConfPill(props){
  const h=props.h;
  const colors={initial:"#eceae4",emerging:"#efe7d3",probable:"#dde8f0",solid:"#5d8f79"};
  const ink={initial:"#6b7a76",emerging:"#8a7434",probable:"#4a6a85",solid:"#fff"};
  return <span className="conf" style={{background:colors[h.status],color:ink[h.status]}}>
    {STATUS_LABEL[h.status]} · {h.confidence}%</span>;
}
export function ClaridadScreen(props){
  const api=props.api; const S=api.S;
  const [layer,setLayer]=useState(1);
  const [showLatent,setShowLatent]=useState(false);
  const [whyKey,setWhyKey]=useState(null);
  const ins=buildInsights(S);
  const hyps=S.hypotheses.slice().sort((a,b)=>priorityOf(S,b)-priorityOf(S,a));
  const mechs=detectedMechanisms(S);
  const style=styleOf(S);
  const layers=ins.primary?styleLayers(coachLayers(ins.primary.h,S),ins.primary.h,style):null;
  const layerBtn=["","Ver por qué","Ver evidencia","Ver experimento","¿Funcionó?"][layer];
  const latents=latentSnapshot(S).slice(0,8);
  const comps=compositeSnapshot(S);
  const activos=S.experiments.filter(x=>x.status==="activo");
  const concluidos=S.experiments.filter(x=>["compatible","parcial","contradicho","inconcluso"].includes(x.status)).slice(-4).reverse();
  const propuestos=hyps.filter(h=>h.confidence>=25&&h.suggestedExperiment
    &&!S.experiments.some(x=>x.hypKey===h.key&&x.status==="activo"));
  const graph=buildRelationGraph(S);
  const closed=closedDays(S).length;
  function funciona(expId,v){
    api.commit(n=>{ resolveExperiment(n,expId,v); });
    api.toast(v==="si"?"Compatible: la confianza sube.":v==="parcial"?"Parcial: se mantiene en observación.":"Contradicho: la confianza baja.");
  }
  function iniciar(hypKey){
    api.commit(n=>{ const h=n.hypotheses.find(x=>x.key===hypKey); if(h) acceptExperiment(n,h,3); });
    api.toast("Experimento iniciado: 3 días lógicos");
  }
  const RES_LABEL={compatible:"compatible",parcial:"parcial",contradicho:"contradicho",inconcluso:"inconcluso"};
  return (
    <div>
      <h2 style={{margin:"6px 2px 12px"}}>Claridad</h2>
      <div className="card acc-coach">
        <div className="tiny" style={{marginBottom:6}}>🧠 Coach · estilo {style}</div>
        {!layers && ins.silenced &&
          <p style={{fontWeight:600}}>🌿 Hoy no veo ningún patrón importante. Sigue viviendo.</p>}
        {!layers && !ins.silenced &&
          <p className="muted">Sigo observando. Todavía no tengo suficiente evidencia para hablar con seriedad.</p>}
        {layers && <div>
          <p style={{margin:"4px 0",fontWeight:600}}>{layers.observation}</p>
          {layer>=2 && <p className="muted" style={{margin:"8px 0"}}>{layers.why}</p>}
          {layer>=3 && <p className="muted" style={{margin:"8px 0"}}>{layers.evidence}</p>}
          {layer>=4 && <p style={{margin:"8px 0",fontWeight:600}}>🧪 {layers.action}</p>}
          {layer>=5 && <div style={{margin:"8px 0"}}>
            {layers.pendingExperiment && layers.pendingExperiment.selfReport && <div>
              <p className="muted" style={{marginBottom:8}}>¿Funcionó el experimento?</p>
              <div className="pillrow">
                <Chip label="Sí" onTap={()=>funciona(layers.pendingExperiment.id,"si")} />
                <Chip label="Parcial" onTap={()=>funciona(layers.pendingExperiment.id,"parcial")} />
                <Chip label="No" onTap={()=>funciona(layers.pendingExperiment.id,"no")} />
              </div>
            </div>}
            {layers.pendingExperiment && !layers.pendingExperiment.selfReport &&
              <p className="muted">Se evalúa con datos al cerrar el día lógico #{layers.pendingExperiment.closesAtDayCount}
                {" "}(faltan {Math.max(0,layers.pendingExperiment.closesAtDayCount-closed)} cierres). Criterio: {layers.pendingExperiment.successCriterion}.</p>}
            {!layers.pendingExperiment && layers.lastResult &&
              <p className="muted">Último experimento: {RES_LABEL[layers.lastResult]}. La confianza ya lo refleja.</p>}
            {!layers.pendingExperiment && !layers.lastResult && ins.primary.h.suggestedExperiment &&
              <Chip label="Iniciar experimento (3 días)" onTap={()=>iniciar(ins.primary.h.key)} />}
          </div>}
          {layer<5 && <Chip label={layerBtn} onTap={()=>setLayer(layer+1)} />}
        </div>}
        {(function(){ const fc=checkFocus(S);
          return fc?<p style={{marginTop:8,fontWeight:600}}>{fc.text}</p>:null; })()}
        {ins.victory && <p style={{marginTop:10,color:"var(--sage-d)",fontWeight:600}}>🏅 {ins.victory.text}</p>}
        {ins.secondary && <p className="muted" style={{marginTop:8}}>
          También: {CONF_PREFIX[ins.secondary.h.status]}{ins.secondary.h.title}.</p>}
      </div>
      <div className="card acc-director">
        <div className="tiny" style={{marginBottom:6}}>🧭 Director · hipótesis por prioridad clínica</div>
        {hyps.length===0 && <p className="muted">Sin hipótesis todavía. Se forman solas con tus eventos.</p>}
        {hyps.map(h=>
          <div key={h.id} style={{padding:"8px 0",borderBottom:"1px solid #f0eee8"}}>
            <div style={{fontWeight:600}}>{h.title.charAt(0).toUpperCase()+h.title.slice(1)}</div>
            <div style={{marginTop:4}}><ConfPill h={h} />
              <span style={{marginLeft:6,fontWeight:700}}>{trendOfHypothesis(h)}</span>
              <span className="muted" style={{marginLeft:8,fontSize:12}}>
                Evidencia: {Math.max(1,Math.round((h.evidenceEventIds||[]).length/2))}
                {h.contradictions?(" · en contra: "+h.contradictions):""}
                {h.lastExperimentResult?(" · experimento: "+RES_LABEL[h.lastExperimentResult]):""}</span>
              <Chip label={whyKey===h.key?"Cerrar":"¿Por qué?"}
                onTap={()=>setWhyKey(whyKey===h.key?null:h.key)} />
            </div>
            {whyKey===h.key && h.breakdown && <div style={{marginTop:8,background:"#f7f5ef",
              borderRadius:12,padding:"8px 10px",fontSize:13}}>
              <div>+{h.breakdown.evidencia} evidencia · +{h.breakdown.recencia} recencia
                {" "}· +{h.breakdown.consistencia} consistencia · {h.breakdown.contradiccion} contradicción
                {" "}· {h.breakdown.experimentos>=0?"+":""}{h.breakdown.experimentos} experimentos
                {" "}= <b>{h.breakdown.total}%</b>{h.breakdown.recortado?" (recortado a 0–100)":""}</div>
              <div className="muted" style={{marginTop:4,fontSize:11}}>{h.breakdown.formula}</div>
              {(h.confidenceHistory||[]).length>0 && <div className="muted" style={{marginTop:4,fontSize:12}}>
                Último cambio: {h.confidenceHistory[h.confidenceHistory.length-1].reason}
                {" "}({fmtDate(h.confidenceHistory[h.confidenceHistory.length-1].at)})</div>}
            </div>}
          </div>)}
      </div>
      <div className="card acc-cientifico">
        <div className="tiny" style={{marginBottom:6}}>🧪 Científico · experimentos</div>
        {activos.map(x=>
          <div key={x.id} style={{padding:"8px 0",borderBottom:"1px solid #f0eee8"}}>
            <p style={{margin:"0 0 4px"}}>🧪 <b>Activo:</b> {x.text}</p>
            <p className="muted" style={{margin:"2px 0",fontSize:12}}>
              Variable: {x.variable} · Espero: {x.expected}</p>
            <p className="muted" style={{margin:"2px 0",fontSize:12}}>
              Criterio: {x.successCriterion} · Condición mínima: {x.minCond}</p>
            {!x.selfReport && <p className="muted" style={{margin:"2px 0",fontSize:12}}>
              Línea base: {x.baseline!=null?x.baseline:"—"} · cierra al día lógico #{x.closesAtDayCount}</p>}
            {x.selfReport && <div className="pillrow" style={{marginTop:6}}>
              <Chip label="Sí funcionó" onTap={()=>funciona(x.id,"si")} />
              <Chip label="Parcial" onTap={()=>funciona(x.id,"parcial")} />
              <Chip label="No" onTap={()=>funciona(x.id,"no")} />
            </div>}
          </div>)}
        {propuestos.map(h=>
          <div key={h.id} style={{padding:"8px 0",borderBottom:"1px solid #f0eee8"}}>
            <p style={{margin:"0 0 6px"}}>💡 {h.suggestedExperiment}</p>
            <Chip label="Iniciar experimento (3 días)" onTap={()=>iniciar(h.key)} />
          </div>)}
        {concluidos.map(x=>
          <p key={x.id} className="muted" style={{margin:"6px 0"}}>
            ✔ {x.text} → <b>{RES_LABEL[x.status]}</b>
            {x.resultValue!=null?(" ("+x.resultValue+" vs base "+x.baseline+")"):""}</p>)}
        {!activos.length&&!propuestos.length&&!concluidos.length &&
          <p className="muted">Sin experimentos por ahora. Nacen de las hipótesis del Director.</p>}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>🕸️ Relaciones · hipótesis temporales, no causalidad</div>
        {graph.edges.length===0 &&
          <p className="muted">Aún no hay relaciones con soporte suficiente. Se necesitan al menos 3-4 días con datos.</p>}
        {graph.edges.map((e,i)=>
          <p key={i} style={{margin:"6px 0",fontSize:14}}>
            {NODE_LABELS[e.from]} → <span className="muted">{EDGE_LABEL[e.type]}{e.invert?" (menos)":""}
            {e.via?(" vía "+NODE_LABELS[e.via]):""}</span> → {NODE_LABELS[e.to]}
            <span className="muted" style={{fontSize:12}}> · n={e.n} · {e.conf}</span></p>)}
        {graph.cycles.map((c,i)=>
          <p key={"c"+i} style={{margin:"6px 0",fontSize:14,fontWeight:600}}>
            🔁 Ciclo posible: {c.chain.map(n=>NODE_LABELS[n]).join(" → ")}
            <span className="muted" style={{fontWeight:400,fontSize:12}}> ({c.conf})</span></p>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>📜 Leyes en formación</div>
        {hyps.filter(h=>h.status==="solid").length===0 &&
          <p className="muted">Aún ninguna. Nacen de evidencia sólida y repetida; se consolidan en Oro tras sobrevivir experimentos.</p>}
        {hyps.filter(h=>h.status==="solid").map(h=>
          <p key={h.id} style={{fontWeight:600}}>📜 {h.title.charAt(0).toUpperCase()+h.title.slice(1)}.</p>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>Mecanismos detectados</div>
        {mechs.length===0 && <p className="muted">Todavía no detecto mecanismos. Los infiero de tus registros.</p>}
        <div className="pillrow">
          {mechs.map(m=><span key={m[0]} className="chip" style={{cursor:"default"}}>{m[0]} ×{m[1]}</span>)}
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <div className="tiny">Variables internas</div>
          <Chip label={showLatent?"Ocultar":"Ver detalle"} onTap={()=>setShowLatent(!showLatent)} />
        </div>
        {showLatent && <div style={{marginTop:10}}>
          {latents.length===0 && <p className="muted">Aún sin señal primaria.</p>}
          {latents.length>0 && <div>
            <div className="tiny" style={{marginBottom:4}}>Primarias</div>
            <div className="pillrow">
              {latents.map(l=><span key={l.key} className="chip" style={{cursor:"default"}}>{l.label} · {l.value}</span>)}
            </div>
          </div>}
          {comps.length>0 && <div style={{marginTop:10}}>
            <div className="tiny" style={{marginBottom:4}}>Compuestas (derivadas, fórmulas documentadas)</div>
            <div className="pillrow">
              {comps.map(l=><span key={l.key} className="chip" style={{cursor:"default",background:"#e8eef4"}}>{l.label} · {l.value}</span>)}
            </div>
          </div>}
          <p className="muted" style={{marginTop:8,fontSize:12}}>
            50 es línea base. Internas: el Director las usa; no son diagnósticos.</p>
        </div>}
      </div>
    </div>
  );
}
export function OroScreen(props){
  const api=props.api; const S=api.S;
  const [period,setPeriod]=useState("week");
  const [battleId,setBattleId]=useState("alcohol_mov");
  const [showCalc,setShowCalc]=useState(false);
  const PERIODS=[["day","Hoy"],["week","Semana"],["prev","Semana anterior"],["p14","14 días"],["p30","30 días"],["all","Todo"]];
  const [openCarta,setOpenCarta]=useState(null);
  const day=openDayRO(S);
  const allDays=S.logicalDays;
  const dayIds = period==="day" ? [day.id]
    : period==="week" ? allDays.slice(-7).map(d=>d.id)
    : period==="prev" ? allDays.slice(-14,-7).map(d=>d.id)
    : period==="p14" ? allDays.slice(-14).map(d=>d.id)
    : period==="p30" ? allDays.slice(-30).map(d=>d.id)
    : allDays.map(d=>d.id);
  const alc=dayIds.reduce((s,id)=>s+alcoholKcalOfDay(S,id),0);
  const ex=dayIds.reduce((s,id)=>s+exerciseKcalOfDay(S,id),0);
  const saldo=ex-alc;
  const maxK=Math.max(alc,ex,1);
  const cds=closedDays(S);
  let alcStreak=0;
  for(let i=cds.length-1;i>=0;i--){
    if(substanceEvents(S,["alcohol"],cds[i].id).length===0) alcStreak++; else break;
  }
  const gap=timeSinceLastSubstance(S,NICOTINE_IDS);
  const dailies=S.cartas.filter(c=>c.type==="daily").slice().reverse();
  const c3s=S.cartas.filter(c=>c.type==="3d").slice().reverse();
  const concluidos=S.experiments.filter(x=>["compatible","parcial","contradicho","inconcluso"].includes(x.status)).slice(-5).reverse();
  const TRENDS=[["nicotina","🚬 Nicotina"],["alcohol","🍺 Alcohol (kcal)"],["sueno","😴 Sueño"],["ejercicio","🏃 Ejercicio (kcal)"]];
  const trendRows=TRENDS.map(([k,l])=>({label:l,t:trendOfMetric(S,k)}));
  const anyTrendOk=trendRows.some(r=>r.t.ok);
  const a1=assocOfMetrics(S,"sueno","nicotina","sueño","nicotina","Dormir menos se asocia con mayor consumo de nicotina");
  const a2=assocOfMetrics(S,"ejercicio","nicotina","ejercicio","nicotina","Más ejercicio se asocia con menor nicotina");
  const RES_LABEL={compatible:"compatible",parcial:"parcial",contradicho:"contradicho",inconcluso:"inconcluso"};
  return (
    <div>
      <h2 style={{margin:"6px 2px 12px"}}>Oro</h2>
      <div className="card acc-oro">
        <div className="tiny" style={{marginBottom:6}}>📜 Leyes personales consolidadas</div>
        {S.laws.length===0 &&
          <p className="muted">Aún no hay leyes. Una hipótesis se promueve sólo tras sobrevivir
            al menos 2 experimentos compatibles, con confianza sólida y 21+ días de vida.</p>}
        {S.laws.map(l=>
          <div key={l.id} style={{padding:"6px 0"}}>
            <p style={{fontWeight:700,margin:0}}>📜 {l.statement}.</p>
            <p className="muted" style={{margin:"2px 0",fontSize:12}}>
              {l.experimentsCompatible} experimentos compatibles · promovida {fmtDate(l.promotedAt)}</p>
          </div>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>🌱 Evolución longitudinal</div>
        {trendRows.map((r,i)=> r.t.ok ?
          <div key={i} className="kv"><span className="muted">{r.label}</span>
            <b>{r.t.dir} {r.t.delta>0?"+":""}{r.t.delta}% <span className="muted" style={{fontWeight:400}}>({r.t.n} días)</span></b></div>
          : null)}
        {!anyTrendOk && <p className="muted">{trendRows[0].t.msg} ({cds.length} días cerrados;
          se necesitan 14 días, 8 con datos y 12 observaciones por variable.)</p>}
        {(a1.ok||a2.ok) && <div style={{marginTop:8}}>
          {a1.ok && <p style={{margin:"4px 0",fontSize:14}}>{a1.phrase}</p>}
          {a2.ok && <p style={{margin:"4px 0",fontSize:14}}>{a2.phrase}</p>}
        </div>}
        {!a1.ok && !a2.ok && anyTrendOk &&
          <p className="muted" style={{marginTop:6}}>{a1.msg}</p>}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>⚔️ Batallas</div>
        <div className="pillrow" style={{marginBottom:8}}>
          {BATTLES.map(bt=><Chip key={bt.id} label={bt.emoji+" "+bt.title} on={battleId===bt.id}
            onTap={()=>{setBattleId(bt.id);setShowCalc(false);}} />)}
        </div>
        <div className="pillrow" style={{marginBottom:8}}>
          {PERIODS.map(p2=><Chip key={p2[0]} label={p2[1]} on={period===p2[0]} onTap={()=>setPeriod(p2[0])} />)}
        </div>
        {(function(){
          const bt=computeBattle(S,battleId,dayIds);
          if(!bt) return null;
          const mx=Math.max(bt.a.value,bt.b.value,1);
          if(bt.a.value===0&&bt.b.value===0)
            return <p className="muted">⚔️ Esta batalla comienza con tu primer registro.</p>;
          return <div>
            <div style={{margin:"8px 0"}}>
              <div className="muted" style={{fontSize:13}}>{bt.a.label}: {bt.a.value} {bt.unit}</div>
              <div style={{height:14,borderRadius:8,background:"var(--clay)",width:Math.max(4,bt.a.value/mx*100)+"%"}}></div>
            </div>
            <div style={{margin:"8px 0"}}>
              <div className="muted" style={{fontSize:13}}>{bt.b.label}: {bt.b.value} {bt.unit}</div>
              <div style={{height:14,borderRadius:8,background:"var(--sage-d)",width:Math.max(4,bt.b.value/mx*100)+"%"}}></div>
            </div>
            <div className="big" style={{color:bt.saldo>=0?"var(--ok)":"var(--clay)"}}>
              Saldo: {bt.saldo>=0?"+":""}{bt.saldo} {bt.unit}</div>
            <p style={{margin:"8px 0",fontWeight:600}}>🎯 {bt.action}</p>
            <Chip label={showCalc?"Cerrar":"¿Cómo se calculó?"} onTap={()=>setShowCalc(!showCalc)} />
            {showCalc && <div style={{marginTop:8,background:"#f7f5ef",borderRadius:12,padding:"8px 10px"}}>
              {bt.how.map((h,k)=><p key={k} className="muted" style={{margin:"4px 0",fontSize:13}}>· {h}</p>)}
              <p className="muted" style={{margin:"6px 0 0",fontSize:12,fontStyle:"italic"}}>{bt.note}</p>
            </div>}
          </div>; })()}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>🏆 Victorias de hoy</div>
        {(function(){ const vs=buildVictories(S).slice(0,3);
          return vs.length? vs.map((v,i)=><p key={i} style={{margin:"6px 0"}}>🏅 {v.text}</p>)
            : <p className="muted">Hoy todavía no hay victorias registradas. Las genera el motor, no la voluntad.</p>; })()}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>Rachas</div>
        <div className="kv"><span className="muted">Días lógicos sin alcohol</span><b>{alcStreak}</b></div>
        <div className="kv"><span className="muted">Sin nicotina ahora</span><b>{fmtDur(gap)}</b></div>
        <div className="kv"><span className="muted">Cartas guardadas</span><b>{S.cartas.length}</b></div>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>🧪 Experimentos concluidos</div>
        {concluidos.length===0 && <p className="muted">Todavía ninguno. Los activos viven en Claridad.</p>}
        {concluidos.map(x=>
          <p key={x.id} className="muted" style={{margin:"6px 0"}}>
            ✔ {x.text} → <b>{RES_LABEL[x.status]}</b></p>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>Cartas de 3 días</div>
        {c3s.length===0 && <p className="muted">Se generan automáticamente cada 3 días lógicos cerrados.</p>}
        {c3s.map(c=>
          <div key={c.id} className="evline" style={{cursor:"pointer",display:"block"}}
            onClick={()=>setOpenCarta(openCarta===c.id?null:c.id)}>
            <div style={{fontWeight:600}}>✉️ {fmtDate(c.createdAt)}</div>
            {openCarta===c.id &&
              Object.values(c.content).map((l,i)=><p key={i} className="muted" style={{margin:"6px 0"}}>{l}</p>)}
          </div>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:6}}>Cartas diarias</div>
        {dailies.length===0 && <p className="muted">La primera carta nace cuando cierres tu primer día con 🌙.</p>}
        {dailies.map(c=>
          <div key={c.id} className="evline" style={{cursor:"pointer",display:"block"}}
            onClick={()=>setOpenCarta(openCarta===c.id?null:c.id)}>
            <div style={{fontWeight:600}}>✉️ {fmtDate(c.createdAt)}</div>
            {openCarta===c.id &&
              Object.values(c.content).map((l,i)=><p key={i} className="muted" style={{margin:"6px 0"}}>{l}</p>)}
          </div>)}
      </div>
    </div>
  );
}
export function ExportSheet(props){
  const api=props.api;
  const json=useMemo(()=>JSON.stringify(api.S,null,2),[api.S]);
  function download(){
    try{
      const blob=new Blob([json],{type:"application/json"});
      const a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="mylife-export-"+dateKey(nowISO())+".json";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }catch(e){ api.toast("Descarga no disponible aquí. Usa Copiar."); }
  }
  function share(){
    if(navigator.share) navigator.share({title:"MyLife export",text:json}).catch(()=>{});
    else api.toast("Compartir no disponible. Usa Copiar.");
  }
  return (
    <Sheet full title="Exportar datos" onClose={api.closeModal}>
      <div className="row" style={{gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <button className="btn" onClick={()=>copyText(json,api.toast)}>Copiar</button>
        <button className="btn sec" onClick={share}>Compartir</button>
        <button className="btn sec" onClick={download}>Descargar</button>
      </div>
      <textarea className="io" readOnly value={json} style={{minHeight:"55vh"}}></textarea>
      <p className="muted" style={{marginTop:8}}>Guarda este texto fuera del teléfono con regularidad. Es tu vida en datos.</p>
    </Sheet>
  );
}
export function ImportSheet(props){
  const api=props.api;
  const [txt,setTxt]=useState("");
  function doImport(){
    let obj=null;
    try{ obj=JSON.parse(txt); }
    catch(e){ api.toast("JSON inválido. Revisa el texto pegado."); return; }
    saveBackupRotating("antes de importar");
    const mig=migrateState(obj);
    rebuildDerived(mig);
    recalcAllHypotheses(mig);
    api.replace(mig);
    api.closeModal();
    api.toast("Importado. Backup automático del estado anterior guardado.");
  }
  return (
    <Sheet full title="Importar datos" onClose={api.closeModal}>
      <p className="muted" style={{marginBottom:8}}>
        Antes de importar se crea un backup automático del estado actual.</p>
      <textarea className="io" placeholder="Pega aquí el JSON exportado…" style={{minHeight:"50vh"}}
        value={txt} onChange={e=>setTxt(e.target.value)}></textarea>
      <button className="btn" style={{marginTop:10,width:"100%"}} onClick={doImport}>
        Validar e importar</button>
    </Sheet>
  );
}
export function DiagSheet(props){
  const api=props.api; const S=api.S;
  const json=useMemo(()=>JSON.stringify(S),[S]);
  const meta=readMeta();
  const backups=listBackups();
  const derivedOk = S.derived && S.derived.eventCount===S.events.length;
  const origin=(typeof location!=="undefined")?(location.protocol==="file:"?"archivo local":location.origin):"—";
  const diagText=[
    "MyLife v"+APP_VERSION+" · schema "+SCHEMA_VERSION,
    "Origen: "+origin,
    "Último guardado: "+(meta.lastSavedAt?fmtDate(meta.lastSavedAt)+" "+fmtClock(meta.lastSavedAt):"—"),
    "Último backup: "+(backups[0]&&backups[0].savedAt?fmtDate(backups[0].savedAt)+" "+fmtClock(backups[0].savedAt)+" ("+backups[0].reason+")":"—"),
    "Backups: "+backups.length,
    "Eventos: "+S.events.length+" · Días lógicos: "+S.logicalDays.length,
    "Snapshots: "+(S.snapshots||[]).length+" · Hipótesis: "+S.hypotheses.length,
    "Experimentos: "+S.experiments.length+" · Leyes: "+(S.laws||[]).length,
    "Tamaño: "+Math.round(json.length/1024)+" KB",
    "Derived cache: "+(derivedOk?"sincronizado":"pendiente de reconstruir"),
  ].join("\n");
  return (
    <Sheet full title="Diagnóstico" onClose={api.closeModal}>
      <div className="card">
        <div className="kv"><span className="muted">Versión</span><b>v{APP_VERSION} · schema {SCHEMA_VERSION}</b></div>
        <div className="kv"><span className="muted">Origen actual</span><b>{origin}</b></div>
        <div className="kv"><span className="muted">Último guardado</span>
          <b>{meta.lastSavedAt?timeAgo(meta.lastSavedAt):"—"}</b></div>
        <div className="kv"><span className="muted">Último backup</span>
          <b>{backups[0]&&backups[0].savedAt?timeAgo(backups[0].savedAt):"—"}</b></div>
        <div className="kv"><span className="muted">Backups guardados</span><b>{backups.length}</b></div>
        <div className="kv"><span className="muted">Eventos</span><b>{S.events.length}</b></div>
        <div className="kv"><span className="muted">Eventos corregidos</span><b>{editedEventsCount(S)}</b></div>
        <div className="kv"><span className="muted">Días lógicos</span><b>{S.logicalDays.length}</b></div>
        <div className="kv"><span className="muted">Snapshots</span><b>{(S.snapshots||[]).length}</b></div>
        <div className="kv"><span className="muted">Hipótesis</span><b>{S.hypotheses.length}</b></div>
        <div className="kv"><span className="muted">Experimentos</span><b>{S.experiments.length}</b></div>
        <div className="kv"><span className="muted">Leyes</span><b>{(S.laws||[]).length}</b></div>
        <div className="kv"><span className="muted">Tamaño JSON</span><b>{Math.round(json.length/1024)} KB</b></div>
        <div className="kv"><span className="muted">Derived cache</span>
          <b>{derivedOk?"✓ sincronizado":"⟳ reconstruir"}</b></div>
      </div>
      <div className="card acc-cientifico">
        <div className="tiny" style={{marginBottom:6}}>🧠 Estado del cerebro</div>
        {(function(){ const bs=brainStatus(S); return <div>
          <div className="kv"><span className="muted">Director</span><b>{bs.director}</b></div>
          <div className="kv"><span className="muted">Coach</span><b>{bs.coach}</b></div>
          <div className="kv"><span className="muted">Insights Engine</span><b>{bs.insights}</b></div>
          <div className="kv"><span className="muted">Científico</span><b>{bs.scientist}</b></div>
          <div className="kv"><span className="muted">Detectores</span><b>{bs.detectors}</b></div>
          <div className="kv"><span className="muted">Último procesamiento</span>
            <b>{bs.lastProcessed?timeAgo(bs.lastProcessed):"—"}</b></div>
          <div className="kv"><span className="muted">Hipótesis activas</span><b>{bs.activeHypotheses}</b></div>
          <div className="kv"><span className="muted">Experimentos activos</span><b>{bs.activeExperiments}</b></div>
          <div className="kv"><span className="muted">Snapshots</span><b>{bs.snapshots}</b></div>
          <div className="kv"><span className="muted">Derived sincronizado</span>
            <b>{bs.derivedSynced?"✓ sí":"⟳ no"}</b></div>
          <div className="kv"><span className="muted">Backups</span><b>{bs.backups}</b></div>
          <div className="kv"><span className="muted">Storage usado</span><b>{bs.storageKB} KB</b></div>
          <div className="kv"><span className="muted">Errores recientes</span>
            <b>{bs.recentErrors.length?bs.recentErrors.length:"ninguno"}</b></div>
        </div>; })()}
      </div>
      <div className="row" style={{gap:8,flexWrap:"wrap"}}>
        <button className="btn sec" onClick={()=>{
          api.commit(n=>{ rebuildDerived(n); recalcAllHypotheses(n); });
          api.toast("Datos derivados reconstruidos desde events.");
        }}>⟳ Reconstruir derivados</button>
        <button className="btn sec" onClick={()=>copyText(diagText,api.toast)}>Copiar diagnóstico</button>
        <button className="btn" onClick={()=>{
          if(window.MyLifeEmergency){ window.MyLifeEmergency.copyRaw()
            .then(()=>api.toast("Datos crudos copiados"))
            .catch(()=>{ window.MyLifeEmergency.downloadRaw(); api.toast("Descargando datos crudos"); }); }
        }}>🛟 Exportar mis datos</button>
      </div>
      <p className="muted" style={{marginTop:10,fontSize:13}}>
        🛟 lee localStorage directamente, sin depender de React ni de esta pantalla.</p>
    </Sheet>
  );
}
export function ConfigScreen(props){
  const api=props.api; const S=api.S;
  const [armDelete,setArmDelete]=useState(false);
  const [histDayId,setHistDayId]=useState(null);
  const [armDelEvent,setArmDelEvent]=useState(null);
  const [armRestore,setArmRestore]=useState(null);
  const [armDelBk,setArmDelBk]=useState(null);
  const backups=listBackups();
  function wipe(){
    if(!armDelete){ setArmDelete(true); setTimeout(()=>setArmDelete(false),4000); return; }
    saveBackupRotating("antes de borrar todo");
    api.replace(defaultState());
    api.toast("Datos borrados. Backup automático guardado.");
    setArmDelete(false);
  }
  function restore(b){
    if(armRestore!==b.key){ setArmRestore(b.key); setTimeout(()=>setArmRestore(null),4000); return; }
    const raw=readBackupRaw(b.key);
    if(!raw){ api.toast("Backup ilegible."); return; }
    let obj=null;
    try{ obj=JSON.parse(raw); }catch(e){ api.toast("Backup corrupto."); return; }
    saveBackupRotating("antes de restaurar backup");
    const mig=migrateState(obj);
    rebuildDerived(mig); recalcAllHypotheses(mig);
    api.replace(mig);
    api.toast("Backup restaurado. El estado previo quedó respaldado.");
    setArmRestore(null);
  }
  const histDays=S.logicalDays.slice(-10).reverse();
  const histEvents=histDayId?dayEvents(S,histDayId).slice().reverse():[];
  return (
    <div>
      <h2 style={{margin:"6px 2px 12px"}}>Configuración</h2>
      <div className="card">
        <div className="kv"><span className="muted">Versión</span><b>MyLife v{APP_VERSION}</b></div>
        <div className="kv"><span className="muted">Schema</span><b>{SCHEMA_VERSION}</b></div>
        <div className="kv"><span className="muted">Migraciones</span><b>{S.migrationLog.length}</b></div>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Coach · estilo de voz</div>
        <div className="pillrow">
          {[["adaptativo","Adaptativo"],["directo","Directo"],["amable","Amable"],["tecnico","Técnico"]].map(o=>
            <Chip key={o[0]} label={o[1]} on={(S.coachStyle&&S.coachStyle.basal)===o[0]}
              onTap={()=>{ api.commit(n=>{ if(!n.coachStyle) n.coachStyle={basal:"adaptativo",learned:{directo:0,amable:0,tecnico:0},lastAskedAt:null}; n.coachStyle.basal=o[0]; }); api.toast("Estilo: "+o[1]); }} />)}
        </div>
        <p className="muted" style={{marginTop:8,fontSize:13}}>
          Adaptativo aprende con una pregunta ocasional (máx. 1 cada 7 días, nunca en pico de SOS).
          El tono cambia; los hechos y la confianza, jamás.</p>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Datos</div>
        <div className="row" style={{gap:8,flexWrap:"wrap"}}>
          <button className="btn sec" onClick={()=>api.openModal({kind:"exportS"})}>Exportar</button>
          <button className="btn sec" onClick={()=>api.openModal({kind:"importS"})}>Importar</button>
          <button className="btn sec" onClick={()=>api.openModal({kind:"diagS"})}>Diagnóstico</button>
        </div>
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Backups automáticos · últimos {backups.length}</div>
        {backups.length===0 && <p className="muted">Aún no hay backups. Se crean solos al importar, borrar, migrar, restaurar y cada 3 días lógicos.</p>}
        {backups.slice(0,10).map(b=>
          <div key={b.key} style={{padding:"8px 0",borderBottom:"1px solid #f0eee8"}}>
            <div style={{fontWeight:600,fontSize:15}}>
              {b.savedAt?fmtDate(b.savedAt)+" "+fmtClock(b.savedAt):"(anterior)"} · {b.reason}</div>
            <div className="muted" style={{fontSize:13,margin:"2px 0 6px"}}>
              {b.eventCount!=null?(b.eventCount+" eventos · "+b.logicalDayCount+" días"):"sin metadatos"}</div>
            <div className="row" style={{gap:8,flexWrap:"wrap"}}>
              <button className="btn sec" onClick={()=>restore(b)}>
                {armRestore===b.key?"¿Seguro? Restaurar":"Restaurar"}</button>
              <button className="btn sec" onClick={()=>{
                const raw=readBackupRaw(b.key);
                if(raw) copyText(raw,api.toast); else api.toast("Backup ilegible.");
              }}>Copiar</button>
              <button className="del" onClick={()=>{
                if(armDelBk!==b.key){ setArmDelBk(b.key); setTimeout(()=>setArmDelBk(null),3000); return; }
                deleteBackupKey(b.key); setArmDelBk(null);
                api.commit(n=>{}); api.toast("Backup borrado");
              }}>{armDelBk===b.key?"¿Seguro?":"Borrar"}</button>
            </div>
          </div>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Registro histórico · corregir errores</div>
        <div className="pillrow">
          {histDays.map(d=>
            <Chip key={d.id} label={fmtDate(d.startedAt)+(d.status==="open"?" · hoy":"")}
              on={histDayId===d.id} onTap={()=>setHistDayId(histDayId===d.id?null:d.id)} />)}
        </div>
        {histDayId && histEvents.length===0 && <p className="muted" style={{marginTop:10}}>Sin eventos ese día.</p>}
        {histDayId && histEvents.map(e=>
          <div key={e.id} className="evline">
            <span className="muted" style={{width:52}}>{fmtClock(e.createdAt)}</span>
            <span>{eventIcon(e)} {eventLabel(e)}</span>
            <button className="del" aria-label="Corregir evento"
              onClick={()=>api.openModal({kind:"edit",eventId:e.id})}>✏️</button>
            <button className="del" onClick={()=>{
              if(armDelEvent!==e.id){ setArmDelEvent(e.id); setTimeout(()=>setArmDelEvent(null),3000); return; }
              saveBackupRotating("antes de borrar evento");
              api.commit(n=>{ deleteEvent(n,e.id); });
              setArmDelEvent(null); api.toast("Evento borrado (backup creado)");
            }}>{armDelEvent===e.id?"¿Seguro?":"Borrar"}</button>
          </div>)}
      </div>
      <div className="card">
        <div className="tiny" style={{marginBottom:8}}>Zona de riesgo</div>
        <button className="btn danger" onClick={wipe}>
          {armDelete?"Toca de nuevo para borrar TODO":"Borrar todos los datos"}</button>
        <p className="muted" style={{marginTop:8}}>Antes de borrar se crea un backup automático de retorno.</p>
      </div>
    </div>
  );
}

