# MyLife — Historial de cambios

## v1.0.0-rc3.3 · 2026-07-14 · "Cierre definitivo · auditoría del ADN"
**APP_VERSION:** 1.0.0-rc3.3 · **SCHEMA_VERSION:** 1 (sin cambio; todo aditivo)
**Build:** dist/app.js sha256[:16] = f3f9672c3ab12072
**Base:** RC3.2 (motor, rutas clínicas, 5 batallas, gráficas, corrección de eventos,
aprendizaje contextual, rescate de datos, modularización). No se reconstruyó nada.

Esta entrega es exclusivamente cierre de calidad y coherencia contra el ADN original.
No se añadieron pestañas, detectores, personajes ni módulos psicológicos nuevos.

### Auditoría del ADN — resultado
Se verificó desde la interfaz real que todas las capacidades del Documento Maestro
están presentes y conectadas: Home de 8 filas (header, pulso compacto, lugar+ejercicio,
estado, sustancias rápidas con café, coach breve, trabajo/ocio, accesos SOS/Resolver/
Entrenar), día lógico por sueño con siesta diferenciada, registro en tres toques con
← Atrás, taxonomías internas (atención, voces, músculos), tiempo y tolerancia,
Director/Coach/Insights/Científico, 18 rutas clínicas diferenciadas con contrato,
aprendizaje por herramienta y contexto, 5 batallas explicables, gráficas con filtros,
cartas diaria y de 3 días, Time Machine, positivo/microestados/vectores, lenguaje
clínico y estética con acentos semánticos.

### Añadido en RC3.3 (sólo lo que faltaba conectar o exponer)
- **§19 🧠 Estado del cerebro** en Diagnóstico: sección técnica derivada del estado real
  (Director/Coach/Insights/Científico operativos, Detectores 17/17, último procesamiento,
  hipótesis y experimentos activos, snapshots, derived sincronizado, backups, storage en KB,
  errores recientes). Ningún indicador es estático.
- **§7 Récords de tiempo/tolerancia**: mejor intervalo histórico de nicotina con su fecha
  y tiempo sin consumo actual, en la vista Intervalos; helpers de tolerancia (impulsos
  tolerados, elecciones deliberadas).
- **§17 Rendimiento**: memoización de microestado y vectores en Pulso por longitud de
  eventos. Prueba de estrés con 2400 eventos sintéticos: rebuildDerived 36 ms,
  recalcAllHypotheses 30 ms, buildInsights 3 ms, buildRelationGraph 98 ms,
  addEvent incremental 15 ms, todo el pipeline 211 ms. Veredicto: fluido.

### Pruebas ejecutadas
- Motor (Node): RC3 30/30, RC2 21/21, fixtures clínicos + Addendum 60/60 = **111/111**.
- Interfaz (Chromium, viewport iPhone): **36/36**, cero errores de consola, cero excepciones.
- Estado del cerebro verificado en interfaz real (detectores 17/17, derived, storage,
  experimentos desde estado real).
- Rendimiento con 2400 eventos: 211 ms total, registro incremental 15 ms.
- Estática: balance de llaves 0 en 32 módulos, 0 duplicados, 0 alert(), 0 CDN,
  0 lenguaje vetado en superficie.

### Limitaciones declaradas (validación del usuario en iPhone)
No verificable en este entorno (file:// sin dispositivo físico): Safari real, teclado iOS
tapando el botón final, safe areas en hardware, pantalla de inicio (PWA), cierre y
relanzamiento en el sistema, modo avión físico, descarga/copia nativas. Por eso la versión
permanece **rc3.3**. Tras tu validación en iPhone (apertura, registro, teclado, sueño,
persistencia, exportación, modo avión, ausencia de errores), sólo se cambia a 1.0.0
sin añadir funciones.

### Congelación
14 días sin funciones nuevas tras esta entrega. Sólo bugs que impidan abrir, registrar,
navegar, dormir/despertar, guardar, exportar, importar, restaurar o recuperar datos.

### Pendientes congelados (backlog, requieren datos reales)
ADN personal definitivo, estaciones de vida, índice global de crecimiento, modo historia
mensual, biblioteca automática, campañas RPG, identidad emergente, nuevas pestañas,
nuevos personajes, IA externa, nuevas sustancias, rediseño del Home.

---

## v1.0.0-rc3.2 · 2026-07-14 · "Cierre funcional + Addendum clínico"
**APP_VERSION:** 1.0.0-rc3.2 · **SCHEMA_VERSION:** 1 (sin cambio; todo aditivo)
**Build:** dist/app.js sha256[:16] = a52ca3c8e13b36a4
**Base congelada:** RC3.1 (arquitectura, schema, motor, Director, Coach, Científico,
snapshots, derived, ledger, latentes, Time Machine, backups, navegación).

### Repositorio profesional
El código fuente modular es ahora el activo oficial (31 módulos). El motor está
completamente desacoplado de React y es reutilizable en nativo.  es sólo
el artefacto compilado. Se recuperó y validó el fuente de RC3.1, se modularizó sin
cambiar comportamiento (regresión 51/51 antes y después), y sobre esa base se
implementó RC3.2 + Addendum.

### RC3.2 — cierre funcional
- **Estado de ánimo histórico completo:** sustituye "Estado difícil" por 🙂 Estado con
  todos los eventos state. Vistas Balance / Emociones / Horario; filtros 7/14/30/Todo.
  Balance por día con dominante; emociones sólo las registradas (nunca inventa dominante);
  horario por franjas (madrugada/mañana/tarde/noche) declarando nivel de evidencia.
  Comparación con periodo anterior bloqueada bajo evidencia mínima.
- **Análisis horario de sustancias:** vistas Cantidad / Horario / Intervalos por sustancia.
  Nicotina agrupa cigarro+IQOS conservando desglose, con despertar→primera, última→sueño,
  intervalos (promedio/mejor/más corto) y concentración por franja. Alcohol con tipos,
  kcal, duración de episodio, proximidad al sueño y relación temporal (asociativa) con
  ejercicio y estados. Mota con intervalos, proximidad al sueño y cercanía a
  fantasía/evasión/rumiación. Lenguaje siempre asociativo.
- **← Atrás en preguntas:** QuestionRunner conserva respuestas por paso, permite corregir,
  elimina respuestas posteriores incompatibles; el evento se construye SÓLO al finalizar;
  ✕ cancela sin guardar; Saltar no crea respuesta clínica.
- **Corregir eventos:** ✏️ junto a 🗑️ en el historial. Conserva originalEvent, editedAt,
  editCount; backup antes de corregir; recalcula derived, hipótesis y snapshot afectados;
  conteo de corregidos en Diagnóstico. Hipótesis, confianza, leyes y snapshots no son
  editables a mano.

### Addendum Final — coherencia clínica
- **Router clínico (18 rutas):** SOS y Resolver dejan de ser el mismo cuestionario.
  Discriminador de entrada → ruta específica → conclusión con Hecho/Inferencia separados
  → acción adulta → evaluación. Rutas: activación (regular primero), angustia corporal,
  angustia difusa, angustia por hecho real, anticipatoria, incertidumbre (con/sin info),
  rumiación, stop-bucle, impulso (físico/emocional/automático/recompensa/evasión),
  tristeza, vacío, soledad, insuficiencia/Juez, celos, momento bueno, acción adulta.
  Nunca "todo está bien / sólo es ansiedad".
- **Contrato de intervención:** guarda estado inicial, distinción (hecho/historia/necesidad),
  intervención usada, acción adulta y resultado en 3 dimensiones (intensidad, perspectiva,
  conducta). Cambiar la conducta cuenta como éxito aunque la intensidad no baje.
- **Aprendizaje por herramienta y contexto:** no repite dos veces seguidas; máx. 2/7 días
  salvo alta eficacia; suspende 14 días tras empeorar dos veces; aprende por mecanismo sin
  generalizar; no elige por frecuencia de uso.
- **5 batallas explicables:** Alcohol vs Movimiento, Nicotina vs Salud, Claridad vs Mota,
  Presencia vs Rumiación, Regulación vs Automatismo. Cada una con dos lados, unidad,
  periodos (Hoy/Semana/Anterior/14/30/Todo), saldo, desglose y "¿Cómo se calculó?".
  Los puntos salen de conducta, nunca de registrar. Sin lenguaje de fracaso.
- **Microestado / microvictoria / vectores:** microestado actual en Pulso (máx. uno, con
  evidencia, tocable, nunca identidad); microvictoria sólo si ocurrió algo real, con
  prioridad clínica; vectores del día (construcción/exploración/evasión/rumiación) con
  contribuyentes explicados y umbral mínimo.
- **Momento bueno:** flujo Bien con ✨ ¿qué estuvo bien? + pregunta rotativa.
- **Foco para mañana:** la carta cierra con 🎯; al día siguiente el Director señala si
  apareció información relacionada.
- **Lenguaje clínico:** lista de términos vetados aplicada; niveles Hecho/Inferencia/
  Hipótesis/Experimento separados y nunca mezclados.
- **Estética final:** colores semánticos por acento (borde/halo, nunca fondo completo),
  jerarquía de cards (primary/secondary/inline), bloque epistémico, microanimaciones
  180–240 ms, confetti sólo al promover una ley personal, prefers-reduced-motion.

### Pruebas ejecutadas
- Motor (Node): RC3 30/30, RC2 21/21 (regresión antes y después de modularizar).
- Fixtures clínicos + Addendum: **60/60** — 16 escenarios con ruta correcta, conclusión
  específica y cero frase genérica; gates del router; discriminador; contrato; aprendizaje
  (no repetir, suspensión, contexto); microestados; vectores; foco; batallas anti-inflado;
  barrido de lenguaje; mood; corrección de eventos.
- Auditoría de interfaz (Chromium, viewport iPhone): **36/36** — atrás en preguntas,
  cerrar sin guardar, corregir con backup, gráficas de estado y sustancias, SOS con ruta
  clínica y contrato, Resolver, Entrenar, 5 batallas, microestado, foco de mañana,
  dormir/despertar/siesta, Time Machine, exportar/importar/restaurar, persistencia,
  panel de error + emergencia. Cero errores de consola, cero excepciones.
- Estática: balance de llaves 0 en 31 módulos, 0 duplicados, 0 alert(), 0 CDN,
  0 lenguaje vetado en superficie.

### Limitaciones declaradas (validación del usuario)
No verificables en este entorno (file:// sin dispositivo físico): Safari/iPhone real,
teclado iOS tapando el botón final, pantalla de inicio (PWA), modo avión físico.
Por eso la versión permanece como **rc3.2**, no 1.0.0, hasta tu validación en el iPhone.

### Pendientes congelados (backlog, no implementar)
Estaciones de vida, ADN personal definitivo, índice global de crecimiento, modo historia
mensual, biblioteca automática, campañas RPG, identidad emergente, nuevas pestañas,
nuevos personajes, IA externa, nuevas sustancias, rediseño del Home.

---

## v1.0.0-rc3.2 · 2026-07-13 · "Entrega final": RC3.2 + Addendum clínico + estética
**APP_VERSION:** 1.0.0-rc3.2 · **SCHEMA_VERSION:** 1 (sin cambio; todo aditivo)
**Fuente del build:** repositorio modularizado en `src/` (31 módulos), 200 funciones exportadas.
**Cerebro RC3.1 congelado** e intocado: arquitectura, schema, eventos, día lógico, Director,
Coach, Insights, Científico, hipótesis, snapshots, derived, ledger, latentes, Time Machine,
preguntas, migraciones, backups, navegación y seguridad de datos se conservan.

### Paso previo: repositorio profesional (Parte I)
El HTML compilado dejó de ser el activo. Se recuperó y validó el fuente RC3.1, se corrió
regresión (51/51), se **modularizó sin cambiar comportamiento** cortando `app.jsx` en 31
módulos con responsabilidades separadas, y se volvió a correr regresión (51/51) antes de
tocar funcionalidad. El motor quedó completamente desacoplado de React (probado en Node).

### RC3.2 — cierre funcional (Parte II)
- **§7 Estado de ánimo histórico completo.** La gráfica ya no se limita a "difícil": usa todos
  los eventos `state` con vistas Balance / Emociones / Horario y filtros 7/14/30/Todo.
  Balance por día (bien/neutral/difícil + dominante) con comparación entre periodos sólo
  cuando hay evidencia. Emociones agrupa únicamente subtipos registrados. Horario reparte en
  madrugada/mañana/tarde/noche y declara nivel de evidencia; no afirma patrones bajo umbral.
- **§8 Análisis horario de sustancias.** Cada sustancia con Cantidad / Horario / Intervalos.
  Nicotina: cigarro+IQOS con desglose, hora pico, franja, despertar→primera, última→sueño,
  intervalo promedio/mejor/peor. Alcohol: bebidas, tipos, kcal, duración de episodio,
  proximidad al sueño, relación temporal (asociativa) con ejercicio y estado. Mota: usos,
  horario, intervalos, proximidad al sueño y cercanía a fantasía/evasión/rumiación.
  Lenguaje siempre asociativo.
- **§9 Atrás en QuestionRunner.** ← regresa una pregunta conservando respuestas; cambiar una
  respuesta elimina las posteriores incompatibles; el evento se construye sólo en finish();
  Saltar guarda el salto sin respuesta clínica; ✕ cancela sin crear eventos parciales.
- **§10 Corregir eventos.** ✏️ junto a 🗑️ en el histórico. Editable: sustancia, tipo de bebida,
  estado, cuerpo, lugar, ejercicio y hora. Conserva `originalEvent` (nunca se sobreescribe),
  `editedAt` y `editCount`; crea backup previo; recalcula derived, hipótesis y snapshot;
  diagnóstico muestra el conteo de corregidos. Hipótesis/confianza/leyes/snapshots no son editables.

### Addendum Final — coherencia clínica (Partes III–X)
- **Router clínico (III).** SOS/Resolver/Entrenar dejan de ser un cuestionario único.
  18 rutas específicas con discriminación → conclusión (Hecho/Inferencia separados) →
  acción adulta → evaluación. Discriminador de entrada del SOS (corporal/difusa/película/
  dolor/urgencia) con segundo nivel. Angustia no se trata como ansiedad; distingue corporal,
  difusa y por hecho real. Anticipatoria, incertidumbre (con/sin info), rumiación (con corte
  de bucle sin dato nuevo), impulso (físico/emocional/automático/recompensa/evasión),
  tristeza, vacío, soledad, insuficiencia/Juez, celos. Cero frases genéricas; prohibido
  "todo está bien / sólo es ansiedad".
- **Contrato de intervención (IV).** Cada intervención profunda guarda estado inicial,
  distinción (hecho/historia/necesidad/dirección), herramienta, acción adulta y resultado en
  tres dimensiones: intensidad, perspectiva y conducta. Cambiar la conducta cuenta como
  éxito aunque la intensidad no baje.
- **Batallas (V).** Cinco con dos lados, unidad explicable, periodos Hoy/Semana/Anterior/14/30/
  Todo, saldo, desglose y botón "¿Cómo se calculó?": Alcohol vs Movimiento, Nicotina vs Salud,
  Claridad vs Mota (índice personal, no neurocognición), Presencia vs Rumiación, Regulación vs
  Automatismo. Los puntos salen de conducta medida contra el propio promedio, nunca de registrar.
- **Microestados, victorias y positivo (VI).** Microestado actual en Pulso (máx. 1, sólo con
  evidencia, tocable, no identidad). Microvictoria sólo si ocurrió algo real, con prioridad
  clínica. Momento bueno con ✨ y preguntas rotativas. Vectores del día
  (construcción/exploración/evasión/rumiación) con % y contribuyentes explicados.
- **Lenguaje (VII).** Barrido automático de términos vetados (recaída, fracaso, deberías…) en
  rutas y batallas; niveles Hecho/Inferencia/Hipótesis/Experimento separados.
- **Estética (VIII).** Colores semánticos por borde/halo (nunca fondo completo), jerarquía de
  cards primary/secondary/inline, bloque epistémico, microanimaciones 180–240 ms, confetti
  sólo para ley personal. SOS en terracota, no rojo alarma.
- **Cierre del día (IX).** La carta termina con 🎯 foco para mañana; el Director lo comprueba
  al día siguiente en Home.
- **Aprendizaje de intervenciones (X).** Memoria por herramienta y contexto: no repetir dos
  veces seguidas, máx. 2/7 días salvo alta eficacia, suspensión 14 días tras empeorar dos veces,
  aprendizaje por mecanismo (no generaliza rumiación→angustia corporal).

### Pruebas ejecutadas
- **Motor (regresión):** 51/51 (30 RC3 + 21 RC2) tras modularizar y tras cada bloque.
- **Clínicas + Addendum:** 60/60 fixtures — 16 escenarios obligatorios (angustia real/difusa,
  anticipatoria, incertidumbre sin info, rumiación por ex, Mika, celos, insuficiencia, craving,
  automático, recompensa, evasión, tristeza, vacío, soledad, día positivo) validando ruta,
  cero frase genérica, hecho vs inferencia, conclusión, acción adulta, resultado y no repetición;
  más gates del router, contrato, aprendizaje, microestados, vectores, foco, batallas y lenguaje.
- **UI (auditoría §42):** 36/36 pasos en Chromium móvil (viewport iPhone, perfil persistente):
  navegación, scroll, safe areas, ← en preguntas, cancelar sin guardar, momento bueno, corregir
  con backup, borrar, gráficas de estado y sustancias, intervalos, SOS con ruta específica y
  contrato, Resolver, Entrenar, 5 batallas explicables, microestado, foco en carta y al día
  siguiente, dormir/despertar/siesta, Time Machine, exportar/importar/restaurar, persistencia
  tras relanzar, panel de error con rescate. Cero errores de consola, cero excepciones.
- **Estática:** balance de llaves 0, 0 funciones duplicadas, 0 `alert()`, 0 CDN, 0 `text/babel`,
  zoom del usuario habilitado. 31 módulos, 200 funciones exportadas.

### Limitaciones y pendientes congelados
- **No verificable en este entorno (requiere el usuario):** Safari/iPhone real, teclado iOS,
  pantalla de inicio (PWA), modo avión físico. El artefacto es `file://` sin red por diseño.
- Por eso la versión se mantiene en **rc3.2**, no en 1.0.0, hasta que Osk valide en su iPhone.
- Backlog explícitamente no implementado (Parte XIII): estaciones de vida, ADN personal
  definitivo, índice global de crecimiento, modo historia mensual, biblioteca automática,
  campañas RPG, identidad emergente, nuevas pestañas/personajes/sustancias, IA externa,
  rediseño total del Home.

### Después de esta entrega
Congelar funciones 14 días. Sólo corrección de bugs críticos. Usar la app, generar datos
reales, evaluar fricción, utilidad y precisión.

---

## v1.0.0-rc3.1 · 2026-07-11 · "Vivible": UX, seguridad de datos y deudas saldadas
Backups rotativos (10) con metadatos y disparadores; diagnóstico completo con fecha de guardado
y backup; exportación de emergencia `window.MyLifeEmergency` fuera de React; registro corporal
directo desde el Pulso; SOS/Resolver/Entrenar/Carta/Despertar en pantalla completa con ← y ✕;
cartas y balance en Pulso; ciclos de batalla completos; tipografía al estándar (17px base,
mínimos 13px); accesibilidad (zoom, 44px, aria-labels, reduced-motion); leyes en formación
restaurada en Claridad. Pruebas: 28/28 aceptación + 51/51 motor. SCHEMA 1.

## v1.0.0-rc3 · 2026-07-10 · "El cerebro se endurece"
Snapshots inmutables + derived reconstruible; ledger de confianza con desglose e historial;
tendencia; prioridad clínica + silencio honesto; Científico formal con experimentos medidos y
promoción a Ley Personal; latentes de segundo nivel; grafo de relaciones con ciclos; umbrales
14/8/12 y 30/20/30; Time Machine; estilo del Coach. 30/30 + 21/21 + 17/17. SCHEMA 1.

## v1.0.0-rc2 · 2026-07-10 · "El cerebro"
17 detectores con evidencia y contradicciones, Insights Engine, Coach de 5 capas, banco
contextual, 16 latentes, aprendizaje de intervenciones, cartas clínicas. 21/21 + 14/14.

## v1.0.0-rc1.1 · 2026-07-10 · Hotfix de empaquetado
React 19 + código compilados dentro del archivo (cero CDN, cero Babel). ErrorBoundary +
arranque protegido + rescate de datos. 17/17 en Chromium, persistencia real.

## v1.0.0-rc1 · 2026-07-10 · Base
Motor (schema→storage→events→cálculos→migración), día lógico por sueño, Home de 8 filas,
5 pestañas, registro rápido/moderado, SOS/Resolver/Entrenar, export/import, cartas. SCHEMA 1.
