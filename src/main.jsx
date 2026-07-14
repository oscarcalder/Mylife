import * as React from "react";
const { useState, useEffect, useMemo, useRef } = React;
import * as ReactDOMClient from "react-dom/client";
const ReactDOM = ReactDOMClient;
import { App } from "./App.jsx";
import { APP_VERSION, SCHEMA_VERSION } from "./engine/config.js";
import { copyText } from "./ui/helpers.js";
/* =====================================================================
   MÓDULO: boot.jsx — ErrorBoundary y arranque protegido (RC2)
   Guardado con typeof document para poder probar el motor en Node.
===================================================================== */
export class ErrorBoundary extends React.Component{
  constructor(p){ super(p); this.state={err:null}; }
  static getDerivedStateFromError(e){ return {err:e}; }
  componentDidCatch(e,info){ console.error("MyLife error:", e, info); }
  render(){
    if(this.state.err){
      const err=this.state.err;
      const diag="MyLife v"+APP_VERSION+" · schema "+SCHEMA_VERSION+"\n"
        +String((err&&err.stack)||err);
      return (
        <main style={{padding:24,fontFamily:"-apple-system,sans-serif"}}>
          <h1 style={{fontSize:20}}>Error de inicio de MyLife</h1>
          <p style={{color:"#667"}}>v{APP_VERSION} · schema {SCHEMA_VERSION}</p>
          <pre style={{whiteSpace:"pre-wrap",background:"#f5f2ec",padding:12,
            borderRadius:12,fontSize:12}}>{String((err&&err.stack)||err)}</pre>
          <button className="btn" onClick={()=>copyText(diag,function(){})}>
            Copiar diagnóstico</button>
        </main>);
    }
    return this.props.children;
  }
}
if(typeof document!=="undefined"){
  try{
    const rootElement=document.getElementById("root");
    if(!rootElement){ throw new Error("No se encontró #root"); }
    const root=ReactDOM.createRoot(rootElement);
    root.render(<ErrorBoundary><App /></ErrorBoundary>);
    window.__MYLIFE_MOUNTED__=true;
  }catch(error){
    window.__MYLIFE_BOOT_FAIL__=true;
    document.body.innerHTML=
      '<main style="padding:24px;font-family:-apple-system,sans-serif">'
      +'<h1 style="font-size:20px">Error de inicio de MyLife</h1>'
      +'<p style="color:#667">v'+APP_VERSION+' · schema '+SCHEMA_VERSION+'</p>'
      +'<pre id="mylife-boot-error" style="white-space:pre-wrap;background:#f5f2ec;'
      +'padding:12px;border-radius:12px;font-size:12px"></pre>'
      +'<button id="mylife-copy" style="padding:12px 16px;border:none;border-radius:12px;'
      +'background:#5d8f79;color:#fff;font-size:16px;margin-right:8px">Copiar diagnóstico</button>'
      +'<button id="mylife-data" style="padding:12px 16px;border:none;border-radius:12px;'
      +'background:#d8b46a;color:#fff;font-size:16px;margin-right:8px">🛟 Copiar datos</button>'
      +'<button id="mylife-dl" style="padding:12px 16px;border:none;border-radius:12px;'
      +'background:#a9c3d9;color:#26302e;font-size:16px">Descargar datos</button></main>';
    const pre=document.getElementById("mylife-boot-error");
    pre.textContent=String((error&&error.stack)||error);
    document.getElementById("mylife-copy").onclick=function(){
      const t="MyLife v"+APP_VERSION+"\n"+pre.textContent;
      if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t); }
    };
    document.getElementById("mylife-data").onclick=function(){
      if(window.MyLifeEmergency) window.MyLifeEmergency.copyRaw();
    };
    document.getElementById("mylife-dl").onclick=function(){
      if(window.MyLifeEmergency) window.MyLifeEmergency.downloadRaw();
    };
  }
}
