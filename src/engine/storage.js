import { APP_VERSION, BACKUP_KEY, SCHEMA_VERSION, STORAGE_KEY } from "./config.js";
import { nowISO } from "../utils/time.js";
/* =====================================================================
   MÓDULO: engine/storage.js + migration.js
===================================================================== */
export function defaultState(){
  return {
    schemaVersion: SCHEMA_VERSION,
    appVersion: APP_VERSION,
    createdAt: nowISO(),
    events: [],
    logicalDays: [],
    sleepSessions: [],
    questionMemory: [],
    hypotheses: [],
    cartas: [],
    interventionStats: {},
    latent: {},
    experiments: [],
    insightHistory: {},
    snapshots: [],
    derived: {days:{},eventCount:-1},
    laws: [],
    coachStyle: {basal:"adaptativo",learned:{directo:0,amable:0,tecnico:0},lastAskedAt:null},
    migrationLog: [],
    sleepingId: null,
    nappingId: null,
  };
}
export function migrateState(raw){
  const base = defaultState();
  if(!raw || typeof raw !== "object"){ return base; }
  const out = Object.assign({}, raw); // conserva campos desconocidos
  let migrated = false;
  Object.keys(base).forEach(k=>{
    if(out[k] === undefined){ out[k] = base[k]; migrated = true; }
  });
  // eventos: agregar campos faltantes con default, sin tocar lo existente
  out.events = (out.events||[]).map(e=>{
    if(e && e.schemaVersion === undefined){ migrated=true; return Object.assign({schemaVersion:"0", }, e); }
    return e;
  });
  if(String(out.schemaVersion) !== SCHEMA_VERSION){
    out.migrationLog = (out.migrationLog||[]).concat([{
      at: nowISO(), from: String(out.schemaVersion), to: SCHEMA_VERSION, app: APP_VERSION
    }]);
    out.schemaVersion = SCHEMA_VERSION;
    migrated = true;
  }
  // RC3: normalizar experimentos legados de RC2 al modelo del Científico
  out.experiments=(out.experiments||[]).map(x=>{
    if(!x||x.durationDays!==undefined) return x;
    const map={si:"compatible",parcial:"parcial",no:"contradicho"};
    return Object.assign({durationDays:3,legacy:true,selfReport:true,
      startAt:x.createdAt||null,
      status:x.status==="accepted"?"activo":(map[x.result]||"inconcluso")},x,
      {status:x.status==="accepted"?"activo":(map[x.result]||x.status||"inconcluso")});
  });
  out.appVersion = APP_VERSION;
  if(migrated && !out.migrationLog.length){
    out.migrationLog.push({ at: nowISO(), note:"defaults agregados", to: SCHEMA_VERSION });
  }
  return out;
}
export function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const out = migrateState(parsed);
    if((out.migrationLog||[]).length > ((parsed&&parsed.migrationLog)||[]).length)
      saveRawBackup(raw, "antes de migrar");
    return out;
  }catch(err){
    console.error("loadState:", err);
    return defaultState();
  }
}
export const BACKUP_PREFIX="mylife_backup_";
export const MAX_BACKUPS=10;
export const META_KEY="mylife_meta";
export function persist(state){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(META_KEY, JSON.stringify({lastSavedAt:nowISO()}));
  }catch(err){ console.error("persist:", err); }
}
export function readMeta(){
  try{ return JSON.parse(localStorage.getItem(META_KEY)||"{}"); }catch(e){ return {}; }
}
export function saveRawBackup(raw, reason){
  try{
    if(!raw) return null;
    let ec=0,dc=0;
    try{ const o=JSON.parse(raw); ec=(o.events||[]).length; dc=(o.logicalDays||[]).length; }catch(e){}
    const id=Date.now().toString(36)+Math.random().toString(36).slice(2,5);
    const rec={id, savedAt:nowISO(), reason, appVersion:APP_VERSION,
      schemaVersion:SCHEMA_VERSION, eventCount:ec, logicalDayCount:dc, data:raw};
    localStorage.setItem(BACKUP_PREFIX+id, JSON.stringify(rec));
    pruneBackups();
    return rec;
  }catch(err){ console.error("backup:", err); return null; }
}
export function saveBackupRotating(reason){
  try{ return saveRawBackup(localStorage.getItem(STORAGE_KEY), reason||"manual"); }
  catch(e){ return null; }
}
export function listBackups(){
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if(k&&k.indexOf(BACKUP_PREFIX)===0){
        try{ const r=JSON.parse(localStorage.getItem(k));
          out.push({key:k,id:r.id,savedAt:r.savedAt,reason:r.reason,
            eventCount:r.eventCount,logicalDayCount:r.logicalDayCount}); }catch(e){}
      }
    }
    if(localStorage.getItem(BACKUP_KEY))
      out.push({key:BACKUP_KEY,id:"legacy",savedAt:null,
        reason:"backup único (versiones previas)",eventCount:null,logicalDayCount:null});
  }catch(e){}
  return out.sort((a,b)=>(b.savedAt||"").localeCompare(a.savedAt||""));
}
export function pruneBackups(){
  try{
    const bs=listBackups().filter(b=>b.key!==BACKUP_KEY);
    while(bs.length>MAX_BACKUPS){
      const old=bs.pop();
      localStorage.removeItem(old.key);
    }
  }catch(e){}
}
export function readBackupRaw(key){
  try{
    const v=localStorage.getItem(key);
    if(!v) return null;
    if(key===BACKUP_KEY) return v;
    return JSON.parse(v).data;
  }catch(e){ return null; }
}
export function deleteBackupKey(key){ try{ localStorage.removeItem(key); }catch(e){} }

