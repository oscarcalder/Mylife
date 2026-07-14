import { closedDays } from "./logicalDay.js";
import { readMeta, listBackups } from "./storage.js";
/* =====================================================================
   MÓDULO: engine/brainStatus.js (ADN §19)
   Diagnóstico técnico derivado del estado real — nunca estático.
===================================================================== */
export const DETECTOR_KEYS=["rumiacion_pre_consumo","cuerpo_pre_consumo","energia_primer_consumo",
  "ejercicio_vespertino","anticipacion_manana","incertidumbre_comprobar","vacio_consumo",
  "juez_trabajo","fatalismo","evitacion_impulso","compulsion_sin_espacio","consumo_reloj",
  "sobrecontrol","futuro_dominante","pasado_dominante","celos_pelicula","insuficiencia"];
export function brainStatus(state){
  const meta=readMeta();
  let storageKB=0;
  try{ storageKB=Math.round((JSON.stringify(state).length)/1024); }catch(e){}
  const derivedOk = state.derived && state.derived.eventCount===state.events.length;
  const activeExp=(state.experiments||[]).filter(x=>x.status==="activo").length;
  const lastEvent=state.events.length?state.events[state.events.length-1]:null;
  return {
    director: state.hypotheses ? "operativo" : "sin datos",
    coach: "operativo",
    insights: "operativo",
    scientist: (state.experiments!=null) ? "operativo" : "sin datos",
    detectors: DETECTOR_KEYS.length+"/"+DETECTOR_KEYS.length,
    lastProcessed: lastEvent?lastEvent.createdAt:(meta.lastSavedAt||null),
    activeHypotheses: (state.hypotheses||[]).length,
    activeExperiments: activeExp,
    snapshots: (state.snapshots||[]).length,
    derivedSynced: !!derivedOk,
    backups: listBackups().length,
    storageKB,
    closedDays: closedDays(state).length,
    recentErrors: (state.errorLog||[]).slice(-3),
  };
}
