# Prueba E2E (Playwright, Python) contra la build de producción con almacenamiento en cookies.
# Uso: npx vite build --outDir <DIR>/dist && python3 tests/e2e/smoke.py <DIR>   (capturas en <DIR>/shots)
import json, sys, time, subprocess, os, tempfile
from playwright.sync_api import sync_playwright
S=sys.argv[1]; URL='http://127.0.0.1:4173/'; os.makedirs(S+'/shots',exist_ok=True)
srv=subprocess.Popen(['python3','-m','http.server','4173','-d',S+'/dist'],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(1); res=[]
def ok(name,cond,extra=''):
    res.append(bool(cond)); print(('PASS' if cond else 'FAIL'),name,extra)
def new_habit(pg,name,goal,diff,color,time_=None):
    pg.get_by_label('Crear hábito').click()
    pg.get_by_placeholder('Ej. Practicar piano').fill(name)
    pg.locator('input[inputmode=numeric]').fill(str(goal))
    pg.get_by_role('button',name=diff).click(); pg.get_by_label(color).click()
    if time_: pg.locator('input[type=time]').fill(time_)
    pg.get_by_role('button',name='Crear hábito').last.click(); pg.wait_for_selector('.modal',state='detached')
try:
  with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    pg=ctx.new_page(); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e))); pg.on('console',lambda m:errs.append(m.text) if m.type=='error' else None)
    pg.goto(URL)
    pg.wait_for_function("()=>{const s=document.getElementById('splash');return !s||getComputedStyle(s).visibility==='hidden'}",timeout=3000)
    ok('splash oculto antes de 1.1 s', pg.evaluate('performance.now()')<=1100, f"{pg.evaluate('performance.now()'):.0f}ms")
    pg.wait_for_selector('#splash',state='detached')
    ok('entra directo, sin login ni configuración', pg.get_by_text('Aún no tienes hábitos').is_visible())
    pg.get_by_label('Tu nombre').fill('Marlon'); pg.get_by_role('button',name='Guardar').click(); pg.get_by_text('Hola, Marlon').wait_for(timeout=3000); ok('pide el nombre y saluda con él', not pg.get_by_label('Tu nombre').count())
    ok('tema oscuro por defecto', pg.evaluate("document.documentElement.dataset.theme")=='dark')
    pg.get_by_label('Crear hábito').click(); pg.get_by_role('button',name='Crear hábito').last.click()
    ok('validación nombre vacío', pg.get_by_text('Escribe un nombre').is_visible())
    pg.get_by_placeholder('Ej. Practicar piano').fill('Practicas de Piano'); pg.locator('input[inputmode=numeric]').fill('0'); pg.get_by_role('button',name='Crear hábito').last.click()
    ok('validación meta 0', pg.get_by_text('entre 1 y 1440').is_visible())
    pg.locator('input[inputmode=numeric]').fill('60'); pg.get_by_role('button',name='Avanzado').click(); pg.locator('input[type=time]').fill('23:00')
    pg.get_by_role('button',name='Crear hábito').last.click(); pg.wait_for_selector('.modal',state='detached')
    new_habit(pg,'Beber agua',5,'Fácil','Azul','07:00'); new_habit(pg,'Sal a Caminar',30,'Avanzado','Amarillo')
    ok('3 hábitos independientes', pg.locator('.card').count()==3)
    ck={c['name']:c for c in ctx.cookies()}
    ok('datos guardados en cookies', 'shift_dn' in ck and 'shift_d0' in ck, ','.join(sorted(k for k in ck if k.startswith('shift'))))
    ok('cada cookie < 4 KB', all(len(c['value'])<4000 for c in ck.values()))
    pg.get_by_label('Crear hábito').click(); pg.get_by_placeholder('Ej. Practicar piano').fill('beber agua'); pg.get_by_role('button',name='Crear hábito').last.click()
    ok('rechaza nombre duplicado', pg.get_by_text('Ya tienes un hábito').is_visible()); pg.keyboard.press('Escape')
    pg.mouse.wheel(0,600); time.sleep(.3); pg.screenshot(path=S+'/shots/home-dark.png')
    pg.locator('.card',has_text='Practicas de Piano').first.click()
    pg.get_by_role('button',name='Iniciar').click(); time.sleep(3.2)
    t=pg.locator('.timer-clock').inner_text(); ok('cronómetro corre', t in('00:03','00:04'),t)
    pg.reload(); pg.wait_for_selector('.timer-clock'); time.sleep(.3)
    t=pg.locator('.timer-clock').inner_text(); ok('sobrevive a recarga sin reiniciarse', t not in('00:00','00:01'),t)
    pg.get_by_role('button',name='Pausar').click(); a=pg.locator('.timer-clock').inner_text(); time.sleep(2.2)
    ok('pausa no acumula', a==pg.locator('.timer-clock').inner_text(), a)
    pg.reload(); pg.wait_for_selector('.timer-clock'); ok('pausa persiste tras recargar', pg.locator('.timer-clock').inner_text()==a and pg.get_by_text('En pausa').is_visible())
    pg.get_by_role('button',name='Reanudar').click(); time.sleep(1.2)
    pg.get_by_role('button',name='Finalizar').dblclick(); pg.wait_for_selector('text=Sesión guardada'); time.sleep(.5)
    ok('doble clic en Finalizar no duplica', pg.locator('.panel .list li').count()==1, str(pg.locator('.panel .list li').count()))
    dur=pg.locator('.panel .list li span').first.inner_text(); ok('duración correcta', dur in ('00:05','00:06','00:07','00:08'), dur)
    pg.reload(); pg.wait_for_selector('.timer-clock'); ok('sin cronómetro activo tras finalizar', pg.get_by_text('Listo para empezar').is_visible())
    # exportar → añadir sesiones de rachas → importar
    pg.goto(URL+'#/habits'); pg.reload(); pg.wait_for_selector('text=Exportar respaldo'); pg.wait_for_selector('#splash',state='detached')
    with pg.expect_download() as d: pg.get_by_role('button',name='Exportar respaldo').click()
    data=json.load(open(d.value.path())); ok('exporta respaldo válido', data['app']=='shift' and len(data['habits'])==3 and len(data['sessions'])==1)
    from datetime import date, timedelta
    day=lambda n:(date.today()-timedelta(days=n)).isoformat()
    agua=[h for h in data['habits'] if h['name']=='Beber agua'][0]['id']; cam=[h for h in data['habits'] if h['name']=='Sal a Caminar'][0]['id']
    for i,(h,n) in enumerate([(agua,0),(agua,0),(agua,1),(agua,3),(cam,6),(cam,7),(cam,8)]):
        data['sessions'].append({'id':f'x{i}','habitId':h,'startedAt':f'{day(n)}T15:00:00Z','endedAt':f'{day(n)}T15:15:00Z','durationSec':900,'day':day(n)})
    tmp=tempfile.mktemp(suffix='.json'); json.dump(data,open(tmp,'w'))
    pg.locator('input[type=file]').set_input_files(tmp); pg.get_by_text('reemplaza todos tus hábitos').wait_for(timeout=3000); ok('importar pide confirmación', True)
    pg.get_by_role('button',name='Reemplazar mis datos').click(); pg.wait_for_selector('text=Respaldo importado')
    bad=tempfile.mktemp(suffix='.json'); open(bad,'w').write('{"foo":1}'); pg.locator('input[type=file]').set_input_files(bad); pg.get_by_role('button',name='Reemplazar mis datos').click()
    pg.get_by_text('Respaldo no válido').wait_for(timeout=3000); ok('rechaza respaldo inválido', True); time.sleep(.3)
    pg.goto(URL+'#/streaks'); pg.reload(); pg.wait_for_selector('.habit-stats'); pg.wait_for_selector('#splash',state='detached')
    ag=pg.locator('.habit-stats li',has_text='Beber agua').inner_text(); ca=pg.locator('.habit-stats li',has_text='Sal a Caminar').inner_text()
    ok('racha Agua 3 (varias sesiones/día = 1; hueco de 1 día no rompe)','3 · mejor 3' in ag, ag.replace('\n',' | '))
    ok('racha Caminar reiniciada: 0, mejor 3','0 · mejor 3' in ca, ca.replace('\n',' | '))
    pg.screenshot(path=S+'/shots/stats-dark.png',full_page=True)
    pg.get_by_role('tab',name='Historial').click(); ok('historial con sesiones', pg.locator('.list li').count()==8)
    # editar / eliminar
    pg.goto(URL+'#/habits'); pg.get_by_label('Editar Sal a Caminar').click(); pg.get_by_placeholder('Ej. Practicar piano').fill('Salir a caminar'); pg.get_by_role('button',name='Guardar cambios').click()
    pg.get_by_text('Salir a caminar').first.wait_for(timeout=3000); ok('editar hábito', True)
    pg.get_by_label('Eliminar Salir a caminar').click(); ok('confirma antes de eliminar', pg.get_by_text('no se puede deshacer').is_visible())
    pg.get_by_role('button',name='Eliminar',exact=True).last.click(); time.sleep(.4); ok('eliminar hábito', pg.get_by_text('Salir a caminar').count()==0)
    # tema claro
    pg.goto(URL+'#/profile'); pg.get_by_role('radio',name='Claro').click(); time.sleep(.2)
    ok('cambia a modo claro', pg.evaluate("document.documentElement.dataset.theme")=='light' and pg.evaluate("getComputedStyle(document.body).backgroundColor")=='rgb(243, 242, 246)')
    pg.screenshot(path=S+'/shots/profile-light.png')
    pg.goto(URL+'#/'); pg.reload(); pg.wait_for_selector('#splash',state='detached'); pg.mouse.wheel(0,600); time.sleep(.3)
    ok('modo claro persiste tras recargar', pg.evaluate("document.documentElement.dataset.theme")=='light'); pg.screenshot(path=S+'/shots/home-light.png')
    pg.goto(URL+'#/streaks'); pg.reload(); pg.wait_for_selector('.habit-stats'); pg.wait_for_selector('#splash',state='detached'); pg.screenshot(path=S+'/shots/stats-light.png',full_page=True)
    pg.goto(URL+'#/profile'); pg.get_by_role('radio',name='Oscuro').click(); ok('vuelve a oscuro', pg.evaluate("document.documentElement.dataset.theme")=='dark')
    # persistencia al cerrar y reabrir
    st=ctx.storage_state(); ctx.close()
    c2=b.new_context(viewport={'width':390,'height':844},storage_state=st); p2=c2.new_page(); p2.goto(URL); p2.wait_for_selector('.card')
    ok('persistencia al reabrir el navegador', p2.locator('.card').count()==2); c2.close()
    for name,vp in [('tablet',{'width':820,'height':1180}),('desktop',{'width':1440,'height':900})]:
        c=b.new_context(viewport=vp,storage_state=st); q=c.new_page(); q.goto(URL); q.wait_for_selector('.card'); time.sleep(1.2); q.screenshot(path=f'{S}/shots/home-{name}.png'); c.close()
    # cookies bloqueadas
    cb=b.new_context(viewport={'width':390,'height':844}); cb.add_init_script("Object.defineProperty(document,'cookie',{get:()=>'',set:()=>{}})")
    q=cb.new_page(); q.goto(URL); q.wait_for_selector('#splash',state='detached'); q.get_by_label('Crear hábito').click(); q.get_by_placeholder('Ej. Practicar piano').fill('Leer'); q.get_by_role('button',name='Crear hábito').last.click()
    q.get_by_text('cookies están desactivadas').first.wait_for(timeout=3000); ok('con cookies bloqueadas avisa y no simula guardar', q.locator('.card').count()==0); cb.close()
    ok('sin errores de consola', not [e for e in errs if 'favicon' not in e], str(errs[:3]))
    b.close()
finally:
    srv.terminate()
print('\nRESUMEN',sum(res),'/',len(res))
