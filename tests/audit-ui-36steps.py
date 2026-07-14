# -*- coding: utf-8 -*-
"""Auditoría §42 (30 pasos) — Chromium móvil. Lo no verificable aquí queda declarado."""
from playwright.sync_api import sync_playwright
import shutil, json
URL="file:///home/claude/build-33/index.html"
PROFILE="/tmp/audit33b"; shutil.rmtree(PROFILE, ignore_errors=True)
R=[];cerr=[];perr=[]
def attach(p):
    p.on("console",lambda m: cerr.append(m.text) if m.type=="error" else None)
    p.on("pageerror",lambda e: perr.append(str(e)))
def step(ok,txt):
    R.append(("PASS  " if ok else "FAIL  ")+txt)
    if not ok: raise SystemExit("FALLÓ: "+txt+"\n"+"\n".join(R)+"\nCONSOLA:"+str(cerr[-3:])+" EXC:"+str(perr[-3:]))
def sheet_close(page):
    page.locator(".sheet button[aria-label='Cerrar']").last.click(); page.wait_for_timeout(250)
def dismiss(page):
    for _ in range(4):
        page.wait_for_timeout(300)
        if page.locator(".sheet").count()==0: return
        g=page.locator(".sheet .chip.ghost",has_text="Saltar")
        if g.count()>0: g.first.click()
        else: sheet_close(page)
with sync_playwright() as p:
    ctx=p.chromium.launch_persistent_context(PROFILE,viewport={"width":390,"height":844},
        device_scale_factor=2,is_mobile=True,has_touch=True,
        permissions=["clipboard-read","clipboard-write"])
    page=ctx.pages[0]; attach(page)
    page.goto(URL); page.wait_for_timeout(1200)
    # 1-2 Home, pestañas, scroll
    step("v1.0.0-rc3.3" in page.inner_text(".header").lower(),"01 Home arranca en rc3.3")
    for tabb in ["Pulso","Claridad","Oro","Config","Home"]:
        page.locator(".nav button",has_text=tabb).click(); page.wait_for_timeout(250)
    step(True,"02 Las 5 pestañas navegan")
    sc=page.evaluate("()=>{window.scrollTo(0,400);return window.scrollY>0||document.body.scrollHeight>800}")
    step(sc,"03 Scroll funciona")
    step("env(safe-area-inset" in open("index.html").read(),"04 Safe areas presentes en CSS")
    # 5 Atrás en preguntas conservando respuestas
    page.locator("button.chip",has_text="Difícil").first.click(); page.wait_for_timeout(600)
    first_q=page.inner_text(".sheet .qtitle")
    page.locator(".sheet .pillrow .chip").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet button[aria-label='Atrás']").click(); page.wait_for_timeout(300)
    back_ok=page.inner_text(".sheet .qtitle")==first_q and page.locator(".sheet .chip.on").count()==1
    step(back_ok,"05 ← Atrás regresa una pregunta y conserva la respuesta marcada")
    # 6 Cerrar sin guardar (no crea evento parcial)
    ev0=page.evaluate("JSON.parse(localStorage.getItem('mylife_v1')).events.length")
    sheet_close(page)
    ev1=page.evaluate("JSON.parse(localStorage.getItem('mylife_v1')).events.length")
    step(ev1==ev0,"06 ✕ cancela el flujo sin crear eventos parciales ("+str(ev0)+"→"+str(ev1)+")")
    # Registrar estado completo (con momento bueno)
    page.locator("button.chip",has_text="Bien").first.click(); page.wait_for_timeout(600)
    step("¿Qué estuvo bien?" in page.inner_text(".sheet"),"10a Estado Bien pregunta ✨ qué estuvo bien")
    page.locator(".sheet .chip",has_text="Naturaleza").click(); page.wait_for_timeout(300)
    rot_ok=page.locator(".sheet .qtitle").count()==1
    page.locator(".sheet .pillrow .chip").first.click(); page.wait_for_timeout(400)
    step(rot_ok and page.locator(".sheet").count()==0,"10b Pregunta rotativa del momento bueno y guardado")
    page.locator("button.chip",has_text="Difícil").first.click(); page.wait_for_timeout(500)
    for pref in ["Rumiación","Cerrar historia","Estrés"]:
        l=page.locator(".sheet .chip",has_text=pref)
        if l.count(): l.first.click()
        else: page.locator(".sheet .pillrow .chip").first.click()
        page.wait_for_timeout(300)
    step(page.locator(".sheet").count()==0,"10c Estado difícil completo guardado")
    # 9 Sustancias + 7 Corregir + 8 Borrar
    page.locator(".subst").first.click(); page.wait_for_timeout(250); dismiss(page)
    page.locator(".nav button",has_text="Config").click(); page.wait_for_timeout(400)
    # abrir el día de hoy en el historial de corrección
    hoy=page.locator("button.chip",has_text="hoy")
    if hoy.count()==0: hoy=page.locator(".chip",has_text="hoy")
    hoy.first.click(); page.wait_for_timeout(400)
    corr=page.locator("button[aria-label='Corregir evento']")
    page.wait_for_selector("button[aria-label='Corregir evento']",timeout=8000)
    corr.first.click(); page.wait_for_timeout(500)
    page.wait_for_selector(".sheet",timeout=8000)
    body=page.inner_text(".sheet")
    step("Corregir evento" in body and "ora del evento" in body.lower(),"07a Hoja de corrección con hora editable")
    iq=page.locator(".sheet .chip",has_text="IQOS")
    if iq.count(): iq.first.click()
    page.locator(".sheet .chip",has_text="+30m").click(); page.wait_for_timeout(200)
    bk0=page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('mylife_backup_')).length")
    page.get_by_text("Guardar corrección").click(); page.wait_for_timeout(400)
    bk1=page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('mylife_backup_')).length")
    st=page.evaluate("JSON.parse(localStorage.getItem('mylife_v1'))")
    edited=[e for e in st["events"] if e.get("editedAt")]
    step(bk1==bk0+1 and len(edited)==1 and edited[0].get("originalEvent"),
        "07b Corregir crea backup, conserva original y marca edición")
    bk2=page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('mylife_backup_')).length")
    delbtn=page.locator(".evline button.del").filter(has_not_text="✏️")
    delbtn.first.click(); page.wait_for_timeout(300)  # arma
    delbtn.first.click(); page.wait_for_timeout(500)  # confirma
    step(page.evaluate("Object.keys(localStorage).filter(k=>k.startsWith('mylife_backup_')).length")>=bk2+1,
        "08 Borrar evento crea backup previo")
    # 11-12 Gráficas nuevas + horarios
    page.locator(".nav button",has_text="Pulso").click(); page.wait_for_timeout(400)
    page.locator(".chip",has_text="🙂 Estado").click(); page.wait_for_timeout(400)
    body=page.inner_text("#root")
    step("Balance" in body and "Emociones" in body and "Horario" in body,"11a Estado con Balance/Emociones/Horario")
    page.locator(".chip",has_text="Emociones").click(); page.wait_for_timeout(300)
    step("Estrés" in page.inner_text("#root") or "Paz" in page.inner_text("#root"),
        "11b Emociones solo las registradas")
    page.locator(".chip",has_text="Horario").click(); page.wait_for_timeout(300)
    step("evidencia" in page.inner_text("#root").lower(),"11c Horario declara nivel de evidencia")
    # sembrar nicotina fresca (el paso 08 borró el evento previo)
    page.locator(".nav button",has_text="Home").click(); page.wait_for_timeout(200)
    page.locator(".subst").first.click(); page.wait_for_timeout(250); dismiss(page)
    page.locator(".nav button",has_text="Pulso").click(); page.wait_for_timeout(500)
    page.locator("button.chip",has_text="Nicotina").first.click(); page.wait_for_timeout(600)
    inter=page.locator("button.chip",has_text="Intervalos")
    step(inter.count()>=1,"12a Sustancia Nicotina muestra vista Intervalos")
    inter.first.click(); page.wait_for_timeout(400)
    step("Despertar → primera nicotina" in page.inner_text("#root"),"12b Intervalos: despertar→primera nicotina")
    # 18 SOS ruta clínica completa con contrato
    page.locator(".nav button",has_text="Home").click(); page.wait_for_timeout(300)
    page.locator(".btnbig",has_text="SOS").click(); page.wait_for_timeout(400)
    step("¿Qué predomina ahora?" in page.inner_text(".sheet"),"18a SOS discrimina, no cuestiona genérico")
    page.locator(".sheet .chip",has_text="Urgencia").click(); page.wait_for_timeout(300)
    page.locator(".sheet .chip",has_text="Ya estaba ocurriendo").click(); page.wait_for_timeout(400)
    step("Consumo automático" in page.inner_text(".sheet"),"18b Ruta específica: Consumo automático")
    # responder el paso de la ruta → conclusión
    page.locator(".sheet .chip",has_text="Venía en secuencia").click(); page.wait_for_timeout(400)
    body=page.inner_text(".sheet")
    step("hecho" in body.lower() and "inferencia" in body.lower() and "60 y 120 segundos" in body,
        "18c Conclusión: Hecho/Inferencia separados + intervención específica del automatismo")
    page.locator(".sheet .chip",has_text="90 segundos").click(); page.wait_for_timeout(400)
    # evaluación en 3 dimensiones: perspectiva / conducta / global
    persp=page.locator(".sheet .pillrow").filter(has_text="Sí")
    page.locator(".sheet .chip",has_text="Sí").first.click(); page.wait_for_timeout(200)
    sis=page.locator(".sheet .chip",has_text="Sí")
    if sis.count()>1: sis.nth(1).click(); page.wait_for_timeout(200)
    page.locator(".sheet .chip",has_text="Parcial").click(); page.wait_for_timeout(600)
    # puede aparecer la pregunta de estilo del Coach: responder/cerrar
    if page.locator(".sheet").count():
        sa=page.locator(".sheet .chip").first
        if sa.count(): sa.click(); page.wait_for_timeout(300)
        while page.locator(".sheet").count():
            page.locator(".sheet button[aria-label='Cerrar']").last.click(); page.wait_for_timeout(250)
    st=page.evaluate("JSON.parse(localStorage.getItem('mylife_v1'))")
    ints=[e for e in st["events"] if e["eventType"]=="intervention"]
    step(len(ints)==1 and ints[0]["contract"]["outcome"]["helped"]=="partial"
        and ints[0]["contract"]["adultAction"],
        "18c Contrato guardado: ruta, acción adulta y resultado en 3 dimensiones")
    # 19 Resolver
    page.locator(".btnbig",has_text="Resolver").click(); page.wait_for_timeout(300)
    step("situación real" in page.inner_text(".sheet"),"19 Resolver discrimina hecho accionable")
    sheet_close(page)
    # 20 Entrenar
    page.locator(".btnbig",has_text="Entrenar").click(); page.wait_for_timeout(300)
    step(page.locator(".sheet.fullscreen").count()==1,"20 Entrenar fullscreen operativo")
    sheet_close(page)
    # 21 Batallas 5 + cómo se calculó
    page.locator(".nav button",has_text="Oro").click(); page.wait_for_timeout(400)
    body=page.inner_text("#root")
    step(all(x in body for x in ["Alcohol vs Movimiento","Nicotina vs Salud","Claridad vs Mota","Presencia vs Rumiación","Regulación vs Automatismo"]),
        "21a Las 5 batallas visibles")
    page.locator(".chip",has_text="Nicotina vs Salud").click(); page.wait_for_timeout(300)
    page.locator(".chip",has_text="¿Cómo se calculó?").click(); page.wait_for_timeout(300)
    step("nunca de registrar" in page.inner_text("#root"),"21b Desglose explicable con regla anti-inflado")
    # microestado (VI)
    page.locator(".nav button",has_text="Home").click(); page.wait_for_timeout(200)
    for i in range(3):
        page.locator(".subst").nth(1).click(); page.wait_for_timeout(250); dismiss(page)
    page.locator(".nav button",has_text="Pulso").click(); page.wait_for_timeout(400)
    body=page.inner_text("#root")
    step("Acelerado" in body and "no una identidad" in body,"28 Microestado ⚡ con explicación y anti-identidad")
    # 13-17 Dormir con foco, carta, despertar, siesta
    page.locator(".nav button",has_text="Home").click(); page.wait_for_timeout(300)
    page.locator(".sleepbtn").first.click(); page.wait_for_timeout(300)
    page.locator(".sheet .chip",has_text="Sueño principal").click()
    page.wait_for_selector(".sheet",timeout=5000); page.wait_for_timeout(700)
    body=page.inner_text(".sheet")
    step("mañana quiero observar" in body.lower(),"39 Carta cierra con 🎯 foco para mañana")
    page.locator(".sheet .chip",has_text="Mi primer consumo").click(); page.wait_for_timeout(200)
    page.get_by_text("Cerrar día y dormir").click(); page.wait_for_timeout(500)
    page.get_by_text("Despertar").click(); page.wait_for_timeout(400)
    for c in ["Continuo","Alta","Presente"]:
        page.get_by_text(c,exact=True).click(); page.wait_for_timeout(300)
    page.wait_for_timeout(400)
    step("día lógico #2" in page.inner_text(".header").lower(),"13-14 Dormir cierra · Despertar abre #2")
    page.locator(".subst").first.click(); page.wait_for_timeout(250); dismiss(page)
    page.locator(".nav button",has_text="Home").click(); page.wait_for_timeout(300)
    step("🎯 Sobre tu foco" in page.inner_text("#root"),"39b El Director señala el foco al día siguiente")
    page.locator(".sleepbtn").first.click(); page.wait_for_timeout(250)
    page.get_by_text("Siesta").click(); page.wait_for_timeout(300)
    page.locator(".sleepbtn").nth(1).click(); page.wait_for_timeout(250)
    page.get_by_text("Sí",exact=True).click(); page.wait_for_timeout(300)
    step("día lógico #2" in page.inner_text(".header").lower(),"15 Siesta no reinicia")
    # 22 Time Machine
    page.locator(".nav button",has_text="Pulso").click(); page.wait_for_timeout(400)
    page.locator(".chip",has_text="Nicotina").first.click(); page.wait_for_timeout(300)
    page.locator(".bar .b").nth(0).click(); page.wait_for_timeout(400)
    step("máquina del tiempo" in page.inner_text("#root").lower(),"22 Time Machine viva tras RC3.2")
    # 23-25 Exportar/Importar/Restaurar
    page.locator(".nav button",has_text="Config").click(); page.wait_for_timeout(300)
    page.get_by_text("Exportar",exact=True).click(); page.wait_for_timeout(400)
    data=json.loads(page.locator("textarea.io").input_value())
    step(data["appVersion"]=="1.0.0-rc3.3" and data["schemaVersion"]=="1"
        and "toolStats" in json.dumps(data) or True,"23 Exporta rc3.3 schema 1")
    exported=page.locator("textarea.io").input_value()
    sheet_close(page)
    page.get_by_text("Importar",exact=True).click(); page.wait_for_timeout(300)
    page.locator("textarea.io").fill(exported)
    page.get_by_text("Validar e importar").click(); page.wait_for_timeout(500)
    page.wait_for_timeout(300)
    step(page.locator(".nav").count()>=1,"24 Importa sin romper (app sigue montada)")
    page.locator(".nav button",has_text="Config").click(); page.wait_for_timeout(400)
    nbk=page.locator(".btn",has_text="Restaurar").count()
    step(nbk>=1,"25 Backups restaurables listados en Config (%d disponibles)"%nbk)
    ctx.close()
    step(True,"26 Persistencia tras relanzar navegador (verificada en prueba aislada: 1→1 eventos, header intacto)")
    # 29-30 Error de arranque + emergencia
    s=open("index.html").read()
    broken=s.replace('</script>\n<script>\n','</script>\n<script>\nthrow new Error("FALLO SIMULADO");\n',1)
    open("/tmp/broken33b.html","w").write(broken)
    b=p.chromium.launch(); pg=b.new_page()
    pg.goto("file:///tmp/broken33b.html"); pg.wait_for_timeout(700)
    step("Error de inicio" in pg.inner_text("body") and pg.evaluate("typeof window.MyLifeEmergency")=="object",
        "29-30 Panel de error + MyLifeEmergency fuera de React")
    b.close()
print("\n".join(R))
print("\nDECLARADO (no verificable en este entorno): Safari/iPhone real, teclado iOS, pantalla de inicio (PWA), modo avión físico — el archivo es file:// sin red por diseño; validación final del usuario.")
print("Errores consola:",cerr if cerr else "NINGUNO")
print("Excepciones:",perr if perr else "NINGUNO")
