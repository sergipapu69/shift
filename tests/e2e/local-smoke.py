# Prueba E2E con Playwright (Python). Uso: construir con VITE_DATA_MODE=local en <DIR>/dist-local y ejecutar: python3 run.py <DIR>
import json, sys, time, subprocess, os
from playwright.sync_api import sync_playwright
S=sys.argv[1]; URL='http://127.0.0.1:4173/'
srv=subprocess.Popen(['python3','-m','http.server','4173','-d',S+'/dist-local'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1)
res=[]
def ok(name,cond,extra=''):
    res.append((name,bool(cond),extra)); print(('PASS' if cond else 'FAIL'),name,extra)
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    t0=time.time(); pg.goto(URL)
    pg.wait_for_selector('#splash',state='attached'); 
    ok('splash visible al inicio', pg.locator('#splash').is_visible())
    pg.screenshot(path=S+'/shots/splash.png')
    pg.wait_for_function("()=>{const s=document.getElementById('splash');return !s||getComputedStyle(s).visibility==='hidden'}",timeout=3000)
    shown=pg.evaluate("performance.now()"); ok('splash oculto antes de 1.1s desde el inicio de la navegación', shown<=1100, f'{shown:.0f}ms')
    pg.wait_for_selector('#splash',state='detached',timeout=3000)
    ok('estado vacío inicial', pg.get_by_text('Aún no tienes hábitos').is_visible())
    pg.screenshot(path=S+'/shots/empty.png')
    # validación
    pg.get_by_label('Crear hábito').click()
    pg.get_by_role('button',name='Crear hábito').last.click()
    ok('validación nombre vacío', pg.get_by_text('Escribe un nombre').is_visible())
    pg.get_by_placeholder('Ej. Practicar piano').fill('Practicas de Piano')
    pg.locator('input[inputmode=numeric]').fill('0'); pg.get_by_role('button',name='Crear hábito').last.click()
    ok('validación meta 0', pg.get_by_text('entre 1 y 1440').is_visible())
    pg.locator('input[inputmode=numeric]').fill('60')
    pg.get_by_role('button',name='Avanzado').click(); pg.locator('input[type=time]').fill('23:00')
    pg.get_by_role('button',name='Crear hábito').last.click()
    pg.wait_for_selector('.modal',state='detached')
    def add(name,goal,diff,color,time_=None):
        pg.get_by_label('Crear hábito').click()
        pg.get_by_placeholder('Ej. Practicar piano').fill(name)
        pg.locator('input[inputmode=numeric]').fill(str(goal))
        pg.get_by_role('button',name=diff).click()
        pg.get_by_label(color).click()
        if time_: pg.locator('input[type=time]').fill(time_)
        pg.get_by_role('button',name='Crear hábito').last.click(); pg.wait_for_selector('.modal',state='detached')
    add('Beber agua',5,'Fácil','Azul','07:00')
    add('Sal a Caminar',30,'Avanzado','Amarillo')
    ok('3 hábitos creados', pg.locator('.card').count()==3)
    # duplicado
    pg.get_by_label('Crear hábito').click(); pg.get_by_placeholder('Ej. Practicar piano').fill('beber agua'); pg.get_by_role('button',name='Crear hábito').last.click()
    ok('rechaza nombre duplicado', pg.get_by_text('Ya tienes un hábito').is_visible()); pg.keyboard.press('Escape')
    pg.screenshot(path=S+'/shots/home-mobile.png'); pg.mouse.wheel(0,600); time.sleep(.3); pg.screenshot(path=S+'/shots/home-mobile2.png')
    # cronómetro
    pg.locator('.card',has_text='Practicas de Piano').click()
    pg.get_by_role('button',name='Iniciar').click(); time.sleep(3.2)
    t=pg.locator('.timer-clock').inner_text(); ok('cronómetro corre', t in('00:03','00:04'),t)
    pg.reload(); pg.wait_for_selector('.timer-clock'); time.sleep(0.3)
    t=pg.locator('.timer-clock').inner_text(); ok('sobrevive a recarga y no se reinicia', t not in('00:00','00:01'),t)
    pg.get_by_role('button',name='Pausar').click(); a=pg.locator('.timer-clock').inner_text(); time.sleep(2.2)
    b2=pg.locator('.timer-clock').inner_text(); ok('pausa no acumula', a==b2,f'{a}->{b2}')
    pg.reload(); pg.wait_for_selector('.timer-clock'); ok('pausa persiste tras recarga', pg.locator('.timer-clock').inner_text()==a and pg.get_by_text('En pausa').is_visible())
    pg.get_by_role('button',name='Reanudar').click(); time.sleep(1.2)
    pg.get_by_role('button',name='Finalizar').dblclick()
    pg.wait_for_selector('text=Sesión guardada'); time.sleep(0.5)
    n=pg.evaluate("JSON.parse(localStorage.getItem('shift.local.v1')).sessions.length"); ok('doble clic en Finalizar no duplica',n==1,str(n))
    d=pg.evaluate("JSON.parse(localStorage.getItem('shift.local.v1')).sessions[0].durationSec"); ok('duración guardada razonable',5<=d<=9,f'{d}s')
    ok('sin cronómetro activo tras finalizar', pg.evaluate("JSON.parse(localStorage.getItem('shift.local.v1')).timers.length")==0)
    ok('racha 1 día', pg.locator('.kpi',has_text='Racha actual').inner_text().count('1')>=1)
    pg.evaluate('document.querySelector(".nav").style.display="none"'); pg.screenshot(path=S+'/shots/detail-mobile.png',full_page=True); pg.evaluate('document.querySelector(".nav").style.display=""')
    # rachas: sesiones en días previos
    pg.evaluate("""()=>{const k='shift.local.v1';const db=JSON.parse(localStorage.getItem(k));const h=db.habits[1];
      const day=(n)=>{const d=new Date();d.setDate(d.getDate()-n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
      // Agua: hoy, ayer, hace 3 (hueco de 1) ; Caminar: hace 6,7,8 (reiniciada)
      [[h,0],[h,0],[h,1],[h,3],[db.habits[2],6],[db.habits[2],7],[db.habits[2],8]].forEach(([hb,n],i)=>db.sessions.push({id:'x'+i+hb.id,habitId:hb.id,startedAt:new Date(Date.now()-n*864e5).toISOString(),endedAt:new Date().toISOString(),durationSec:900,day:day(n)}));
      localStorage.setItem(k,JSON.stringify(db))}""")
    pg.goto(URL+'#/streaks'); pg.reload(); pg.wait_for_selector('.habit-stats')
    txt=pg.locator('.habit-stats').inner_text()
    ok('racha Agua: 3 días (varias sesiones el mismo día = 1; hueco de 1 día no rompe)', 'mejor 3' in pg.locator('.habit-stats li',has_text='Beber agua').inner_text(), pg.locator('.habit-stats li',has_text='Beber agua').inner_text().replace('\n',' | '))
    ok('racha Caminar reiniciada (0) y mejor 3', '0 · mejor 3' in pg.locator('.habit-stats li',has_text='Sal a Caminar').inner_text())
    pg.wait_for_selector('#splash',state='detached'); pg.screenshot(path=S+'/shots/stats-mobile.png',full_page=True)
    pg.get_by_role('tab',name='Historial').click(); ok('historial lista sesiones', pg.locator('.list li').count()>=8); pg.screenshot(path=S+'/shots/history-mobile.png',full_page=True)
    # editar / eliminar
    pg.goto(URL+'#/habits'); pg.get_by_label('Editar Sal a Caminar').click(); pg.get_by_placeholder('Ej. Practicar piano').fill('Salir a caminar'); pg.get_by_role('button',name='Guardar cambios').click()
    ok('editar hábito', pg.get_by_text('Salir a caminar').first.is_visible())
    pg.get_by_label('Eliminar Salir a caminar').click(); ok('confirmación antes de eliminar', pg.get_by_text('no se puede deshacer').is_visible())
    pg.get_by_role('button',name='Eliminar',exact=True).last.click(); time.sleep(0.4)
    ok('eliminar hábito', pg.get_by_text('Salir a caminar').count()==0)
    # persistencia cerrando contexto
    st=ctx.storage_state(); ctx.close()
    ctx2=b.new_context(viewport={'width':390,'height':844},storage_state=st); p2=ctx2.new_page(); p2.goto(URL); p2.wait_for_selector('.card')
    ok('persistencia al reabrir navegador', p2.locator('.card').count()==2)
    ctx2.close()
    for name,vp in [('tablet',{'width':820,'height':1180}),('desktop',{'width':1440,'height':900})]:
        c=b.new_context(viewport=vp,storage_state=st); q=c.new_page(); q.goto(URL); q.wait_for_selector('.card'); time.sleep(1.2); q.screenshot(path=f'{S}/shots/home-{name}.png'); 
        q.goto(URL+'#/streaks'); time.sleep(.3); q.screenshot(path=f'{S}/shots/stats-{name}.png'); c.close()
    ok('sin errores de consola', not [e for e in errs if 'favicon' not in e and 'fonts' not in e.lower() and 'ERR_' not in e], str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print('\nRESUMEN', sum(1 for r in res if r[1]),'/',len(res))
