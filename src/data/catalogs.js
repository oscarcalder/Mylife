/* =====================================================================
   MÓDULO: data/catalogs.js
===================================================================== */
export const SUBSTANCES = [
  { id:"cigarro", label:"Cigarro", emoji:"🚬", bg:"#efe6da" },
  { id:"iqos",    label:"IQOS",    emoji:"💨", bg:"#e3e9ef" },
  { id:"mota",    label:"Mota",    emoji:"🍃", bg:"#e2ecdf" },
  { id:"alcohol", label:"Alcohol", emoji:"🍺", bg:"#f0e7d6" },
  { id:"cafe",    label:"Café",    emoji:"☕", bg:"#ece4de" },
];
export const NICOTINE_IDS = ["cigarro","iqos"];
export const ALCOHOL_TYPES = [
  { id:"ultra", label:"Ultra", kcal:95 },
  { id:"victoria", label:"Victoria", kcal:140 },
  { id:"cerveza", label:"Cerveza", kcal:150 },
  { id:"mezcal", label:"Mezcal", kcal:100 },
  { id:"tequila", label:"Tequila", kcal:100 },
  { id:"vino", label:"Vino", kcal:120 },
  { id:"whisky", label:"Whisky", kcal:110 },
  { id:"otro", label:"Otro", kcal:120 },
];
export const PLACES = ["Casa","Consultorio","Quirófano","Coche","Calle","Restaurante","Otro"];
export const EXERCISES = [
  { id:"spinning", label:"Spinning", kcalMin:9 },
  { id:"fuerza", label:"Fuerza casa", kcalMin:6 },
  { id:"caminata", label:"Caminata", kcalMin:4 },
  { id:"funcional", label:"Funcional", kcalMin:7 },
  { id:"estiramiento", label:"Estiramiento", kcalMin:2.5 },
  { id:"otro", label:"Otro", kcalMin:5 },
];
export const EX_DURATIONS = [10,20,30,45,60,90];
export const MICROACTIONS = [
  { id:"lagartijas20", label:"20 lagartijas", kcal:20 },
  { id:"sentadillas", label:"Sentadillas", kcal:15 },
  { id:"escaleras", label:"Escaleras", kcal:30 },
  { id:"caminar10", label:"Caminar 5-10 min", kcal:40 },
  { id:"estiramiento", label:"Estiramiento", kcal:20 },
  { id:"movilidad", label:"Movilidad", kcal:15 },
  { id:"paseo", label:"Paseo corto", kcal:25 },
  { id:"abdomen", label:"Abdomen", kcal:20 },
  { id:"respiracion", label:"Respiración activa", kcal:5 },
  { id:"ordenar", label:"Ordenar algo físico", kcal:15 },
];
export const STATE_BRANCHES = [
  { id:"bien", label:"Bien", emoji:"🌿", bg:"#e2ecdf" },
  { id:"neutral", label:"Neutral", emoji:"〰️", bg:"#e9e7e0" },
  { id:"dificil", label:"Difícil", emoji:"🌧", bg:"#e8e0e6" },
];
export const BODY_OPTIONS=[
  ["relajado","😌 Relajado"],["pesado","🪨 Pesado"],["con_energia","⚡ Con energía"],
  ["tenso","🫨 Tenso"],["pecho","🫁 Pecho"],["garganta","🗣️ Garganta"],
  ["mandibula","🦷 Mandíbula"],["estomago","🌀 Estómago"],["cuello","💆 Cuello"],
  ["cabeza","🤕 Cabeza"],["hambre","🍽️ Hambre"],["sin_molestia","➖ Sin molestias"]];
export const BODY_LABEL={}; BODY_OPTIONS.forEach(([v,l])=>{BODY_LABEL[v]=l;});
export const MUSCLES = ["incertidumbre","impulso","rumiación","presencia","soledad","vacío","regulación","construcción"];

