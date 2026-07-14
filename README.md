# MyLife v1.0.0-rc3.3

Sistema personal de metaconciencia conductual. Sin IA externa. Motor de inferencia
basado en eventos, tiempo, patrones, hipótesis y confianza.

## Arquitectura — cerebro desacoplado de React

Toda la lógica vive fuera de React y es reutilizable en iOS/Android nativo:

```
src/
  data/         catálogos, banco de preguntas, intervenciones
  engine/       storage, migración, día lógico, eventos, cálculos, snapshots,
                director, insights, coach, científico, cartas, latentes,
                relaciones/tendencias, moodStats, substanceStats,
                clinicalRouter, battles, microstates, language
  ui/           helpers, atoms, flows, interventionsFlows, screens
  App.jsx       orquestador (sólo render + comandos)
  main.jsx      arranque protegido + ErrorBoundary
  app.css
tests/          motor (Node) + auditoría UI (Playwright)
```

React sólo renderiza, recoge interacciones, dispara comandos y muestra resultados.
El motor se prueba de forma independiente con `tsx` (sin navegador).

## Fuente de verdad

`events > snapshots > derived cache > UI`. Si hay discrepancia, ganan los eventos.
Migraciones no destructivas. Backup antes de migrar, importar, corregir, borrar, restaurar.
`SCHEMA_VERSION = "1"` — todos los cambios de esta versión son aditivos.

## Build

```
npm install
npm run build      # → dist/app.js (IIFE, sin CDN)
npm test           # motor + fixtures clínicos
npm run test:ui    # auditoría de interfaz (Chromium)
```

`index.html` es el artefacto compilado: autocontenido, cero CDN, abre sin internet,
con panel de error y exportación de emergencia (`window.MyLifeEmergency`).

## RC3.2 + Addendum Final

Estado de ánimo histórico completo (Balance/Emociones/Horario); análisis horario de
sustancias (Cantidad/Horario/Intervalos); ← Atrás en preguntas; corrección de eventos
con rastro; router clínico con 18 rutas específicas (angustia corporal/difusa/hecho real,
anticipatoria, incertidumbre, rumiación, impulso ×5, tristeza, vacío, soledad, juez,
celos, momento bueno); contrato de intervención con resultado en 3 dimensiones;
aprendizaje por herramienta y contexto; 5 batallas explicables; microestado, microvictoria
y vectores del día; foco para mañana; lenguaje clínico con niveles epistémicos separados;
estética final con acentos semánticos.

Congelado 14 días tras esta entrega: sólo corrección de bugs críticos.
