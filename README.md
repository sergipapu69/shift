# SHIFT

Aplicación web de seguimiento de hábitos y registro de tiempo. Cada hábito tiene su cronómetro, su racha independiente, metas de tiempo, estadísticas e historial. **No necesita cuentas ni configuración**: los datos se guardan en **cookies del navegador** del usuario. Incluye modo oscuro, claro y automático (sistema).

**Stack:** React 19 + TypeScript + Vite · CSS propio · Vitest. Sin librerías de gráficos ni de rutas (~70 kB gzip). Supabase queda como opción (ver abajo).

## Funcionalidades

- Splash «SHIFT» en CSS puro (visible ≈0,8 s, nunca bloquea la app).
- Hábitos: crear, editar, eliminar; categoría opcional, meta diaria en minutos, frecuencia por días, dificultad, color y recordatorio. Validaciones y confirmaciones.
- Cronómetro por hábito: iniciar, pausar, reanudar, finalizar, descartar. Se calcula con **marcas de tiempo** y se guarda al instante, así que sobrevive a recargas y a cambios de sección. Finalizar es idempotente (el id de la sesión es el del cronómetro): sin duplicados ni con doble clic.
- Rachas independientes por hábito (actual y mejor), calculadas desde las sesiones guardadas.
- Estadísticas (tiempo total, por hábito, progreso de hoy y de 7 días frente a la meta, gráfico de 14 días) e historial por día con filtro y borrado.
- **Modo claro / oscuro / sistema** en *Perfil → Apariencia*, guardado en la cookie `shift_theme` y aplicado antes de pintar (sin parpadeo).
- **Respaldo**: exportar e importar todos los datos en JSON (*Mis hábitos → Almacenamiento*), con medidor de espacio.
- Responsive: móvil (navegación inferior como la referencia), tablet y escritorio (navegación lateral).

### Regla de rachas

La racha cuenta **días distintos** con actividad (varias sesiones el mismo día = 1 día). Un día continúa la racha si entre él y el anterior hay **como máximo 2 días completos sin actividad**; con **3 días consecutivos sin actividad se reinicia**. Los días son cadenas `YYYY-MM-DD` locales con aritmética en UTC (sin depender de zona horaria ni de cambios de horario). Código en `src/lib/streaks.ts`, con tests.

## Cómo se guardan los datos (cookies)

Todo el estado (hábitos, sesiones, cronómetros) se serializa en JSON compacto → gzip → base64url y se reparte en cookies `shift_d0…shift_d7` + `shift_dn` (número de trozos). Cookie de primera parte, `Path=/`, `SameSite=Lax`, `Secure` en https, caducidad de 400 días (el máximo que permiten los navegadores). Si el navegador bloquea las cookies, la app lo detecta y avisa en vez de aparentar que guarda.

Qué implica, para saberlo:

- **Capacidad:** unas **750 sesiones** (≈24 KB). Las cookies viajan en cada petición al sitio, por eso hay un tope prudente. Al acercarse al límite el medidor avisa; el guardado se rechaza con un mensaje claro si se llena (exporta un respaldo y elimina sesiones antiguas).
- **Sin sincronización:** cada navegador/dispositivo tiene sus propios datos.
- **Se pierden** si se borran las cookies del sitio o se usa una ventana privada. Descarga un respaldo de vez en cuando.
- Los cronómetros activos se guardan igual: si cierras el navegador y vuelves, el tiempo sigue contando desde la hora de inicio.

## Ejecutar en local

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # tests unitarios
npm run build      # tsc + build de producción en dist/
```

## Desplegar en Vercel

No hace falta ninguna variable de entorno ni servicio externo.

1. En Vercel: **Add New → Project** e importa `sergipapu69/shift`.
2. Framework **Vite** (lo detecta `vercel.json`); build `npm run build`, salida `dist`.
3. **Deploy**.

Las cookies pertenecen al dominio donde se abre la app: si cambias de dominio (p. ej. de una URL de preview a la de producción), los datos no se trasladan; usa exportar/importar.

## Opcional: Supabase (cuentas + sincronización entre dispositivos)

Si defines `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en la compilación, la app usa Supabase en lugar de cookies (login por correo, datos por usuario con RLS). Pasos: crear un proyecto, ejecutar `supabase/schema.sql` en el SQL Editor, activar el proveedor Email y añadir la URL de la app en *Authentication → URL Configuration*. Usa solo la clave `anon`, nunca la `service_role`. **Este modo está escrito pero no se ha probado contra un proyecto real.**

## Estructura

```
src/lib/        dominio puro: fechas, rachas, cronómetro, estadísticas, tema (testeado)
src/data/       almacenamiento: cookies (por defecto, con codec y validación de respaldos) y Supabase (opcional)
src/store.tsx   estado global, cronómetros recuperables, sincronización al volver a la pestaña
src/screens/    Inicio, Detalle de hábito, Mis hábitos, Rachas/Estadísticas, Perfil
src/components/ tarjetas, navegación, cronómetro, gráfico, modales
supabase/       schema.sql (solo para el modo opcional)
tests/          unitarios (Vitest) y E2E (Playwright, tests/e2e/smoke.py)
```

## Pruebas realizadas

- `npm test`: 25 tests unitarios (rachas, fechas, cronómetro, estadísticas, codec de cookies, validación de respaldos) ✔
- `npm run build`: sin errores de tipos ni de compilación ✔
- E2E en Chromium real contra la build de producción — 32/32 ✔: splash <1 s, primera visita pide el nombre, validaciones, hábitos independientes, datos en cookies (<4 KB cada una), cronómetro que sobrevive a recargas, pausa que no acumula, doble clic en «Finalizar» sin duplicar, exportar/importar (y rechazo de archivos inválidos), rachas (varias sesiones el mismo día, hueco de 1 día, reinicio tras 3 días, mejor racha conservada), historial, editar, eliminar con confirmación, tema claro persistente, persistencia al reabrir el navegador, aviso con cookies bloqueadas, sin errores de consola.
- Capturas revisadas en móvil, tablet y escritorio, en oscuro y claro.

## Limitaciones conocidas

- Las imágenes 3D de la referencia (teclado, botella) se recrearon como ilustraciones SVG. Sin cuentas no hay foto de perfil: el avatar muestra la inicial.
- Los recordatorios se muestran en las tarjetas pero no envían notificaciones.
