import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
/* =====================================================================
   MÓDULO: ui/atoms.jsx
===================================================================== */
export function Chip(props){
  return (
    <button className={"chip"+(props.on?" on":"")+(props.ghost?" ghost":"")}
      onClick={props.onTap}>{props.label}</button>
  );
}
export function Sheet(props){
  const full=!!props.full;
  return (
    <div className={"sheet"+(full?" fullscreen":"")}
      onClick={e=>{ if(!full && e.target===e.currentTarget && props.onClose) props.onClose(); }}>
      <div className="body">
        <div className="sheethead row">
          {props.onBack
            ? <button className="x" aria-label="Atrás" onClick={props.onBack}>←</button>
            : <span className="headspace"></span>}
          <h3>{props.title}</h3>
          <button className="x" aria-label="Cerrar" onClick={props.onClose}>✕</button>
        </div>
        {props.progress!=null &&
          <div className="progress"><i style={{width:(props.progress*100)+"%"}}></i></div>}
        {props.children}
      </div>
    </div>
  );
}
export function QuestionRunner(props){
  const [i,setI]=useState(0);
  const [records,setRecords]=useState([]); // records[k] = respuesta del paso k
  const qs=props.questions;
  const q=qs[i];
  function answersFrom(recs){
    const a={};
    recs.forEach((r,k)=>{ if(r&&r.value!=null&&qs[k]) a[qs[k].variable]=r.value; });
    return a;
  }
  function commit(val){
    // al cambiar una respuesta previa se eliminan las posteriores incompatibles
    const recs=records.slice(0,i);
    recs[i]={id:q.id,text:q.text,value:val};
    if(i+1<qs.length){ setRecords(recs); setI(i+1); }
    else props.onFinish(answersFrom(recs),recs); // el evento se construye SOLO aquí
  }
  const prev=records[i]?records[i].value:undefined;
  return (
    <div>
      <div className="row" style={{marginBottom:4}}>
        {i>0
          ? <button className="x" aria-label="Atrás" onClick={()=>setI(i-1)}>←</button>
          : <span className="headspace"></span>}
        <div className="progress" style={{flex:1,margin:"0 10px"}}>
          <i style={{width:((i+1)/qs.length*100)+"%"}}></i></div>
        <span className="muted" style={{fontSize:13}}>{i+1}/{qs.length}</span>
      </div>
      <div className="qtitle">{q.text}</div>
      <div className="pillrow">
        {q.options.map(o=>
          <Chip key={o[0]} label={o[1]} on={prev===o[0]} onTap={()=>commit(o[0])} />)}
      </div>
      <div className="row" style={{marginTop:16,justifyContent:"flex-end"}}>
        <Chip ghost label="Saltar" onTap={()=>commit(null)} />
      </div>
    </div>
  );
}


