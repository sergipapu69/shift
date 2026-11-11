# SHIFT

Aplicación web de seguimiento de hábitos y registro de tiempo. Cada hábito tiene su cronómetro, su racha independiente, metas de tiempo, estadísticas e historial. Los datos viven en **Supabase** (PostgreSQL + autenticación) y cada usuario solo ve los suyos (Row Level Security).

**Stack:** React 19 + TypeScript + Vite · Supabase (`@supabase/supabase-js`) · CSS propio · Vitest. Sin librerías de gráficos ni de rutas (el bundle pesa ~69 kB gzip).

## Funcionalidades

- Splash «SHIFT» en CSS puro (visible ≈0,8 s, nunca bloquea la app).
- Cuentas (correo + contraseña) y datos separados por usuario.
- Hábitos: crear, editar, eliminar, categoría opcional, meta diaria en minutos, frecuencia por días, dificultad, color y recordatorio. Validaciones y confirmaciones.
- Cronómetro por hábito: iniciar, pausar, reanudar, finalizar, descartar. Se calcula con **marcas de tiempo** y se guarda en la base de datos, por lo que sobrevive a recargas, cambios de sección y de dispositivo. Finalizar es idempotente: el id de la sesión es el del cronómetro (clave primaria), así que no hay duplicados ni con doble clic.
- Rachas independientes por hábito (actual y mejor) calculadas desde las sesiones guardadas.
- Estadísticas: tiempo total, por hábito, progreso de hoy y de 7 días frente a la meta, gráfico de 14 días.
- Historial por día con filtro por hábito y borrado de sesiones.
- Responsive: móvil (navegación inferior como en la referencia), tablet (3 columnas) y escritorio (navegación lateral, 4 columnas).

### Regla de rachas (decisión de diseño)

La racha cuenta **días distintos** con actividad (varias sesiones el mismo día = 1 día). Un día de actividad continúa la racha si entre él y el anterior hay **como máximo 2 días completos sin actividad**; con **3 días consecutivos sin actividad se reinicia**. Los días se manejan como cadenas `YYYY-MM-DD` locales y la aritmética se hace en UTC, sin depender de zona horaria ni de cambios de horario. El día de una sesión es el día local en que empezó. Está en `src/lib/streaks.ts` y se valida con tests.

## Configurar Supabase (obligatorio, una sola vez)

1. Crea un proyecto en <https://supabase.com>.
2. **SQL Editor → New query**, pega todo `supabase/schema.sql` y ejecuta (crea tablas, políticas RLS y el trigger de perfiles; se puede repetir sin riesgo).
3. **Authentication → Providers → Email** activado. Si quieres entrar sin confirmar el correo, desactiva *Confirm email*; si no, el usuario recibe un correo de confirmación.
4. **Authentication → URL Configuration**: en *Site URL* y *Redirect URLs* añade la URL de Vercel (y `http://localhost:5173` para desarrollo).
5. **Project Settings → API**: copia *Project URL* y la clave **anon public**.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `VITE_SUPABASE_URL` | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública `anon` (protegida por RLS). **Nunca** uses la `service_role` |
| `VITE_DATA_MODE=local` | *Solo desarrollo/pruebas*: guarda en `localStorage`, sin cuentas ni sincronización; muestra un aviso amarillo. No activar en producción |

Copia `.env.example` a `.env` y rellénalo. `.env` está en `.gitignore`.

## Ejecutar en local

```bash
npm install
cp .env.example .env     # rellena las dos variables de Supabase
npm run dev              # http://localhost:5173
npm test                 # tests unitarios
npm run build            # tsc + build de producción en dist/
```

## Desplegar en Vercel

1. En Vercel: **Add New → Project** e importa `sergipapu69/shift`.
2. Framework: **Vite** (lo detecta `vercel.json`). Build `npm run build`, salida `dist`.
3. En **Settings → Environment Variables** añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` (Production, Preview y Development) y **Deploy**.
4. Añade la URL resultante a las *Redirect URLs* de Supabase (paso 4 de arriba).

Las variables `VITE_*` se incrustan en la compilación: tras cambiarlas hay que volver a desplegar. Si faltan, la app muestra una pantalla «Falta configurar Supabase» en lugar de fingir que guarda.

## Estructura

```
src/lib/        dominio puro: fechas, rachas, cronómetro, estadísticas (testeado)
src/data/       capa de datos: Supabase y modo local de desarrollo
src/store.tsx   estado global, cronómetros recuperables, sincronización al volver a la pestaña
src/screens/    Inicio, Detalle de hábito, Mis hábitos, Rachas/Estadísticas, Perfil, Acceso
src/components/ tarjetas, navegación, cronómetro, gráfico, modales
supabase/       schema.sql (tablas + RLS)
tests/          unitarios (Vitest) y humo E2E (Playwright)
```

## Pruebas realizadas

- `npm test`: 17 tests unitarios (rachas, fechas, cronómetro, estadísticas) ✔
- `npm run build` con y sin `VITE_DATA_MODE`: sin errores de tipos ni de compilación ✔
- E2E en navegador real (Chromium, 390 px) contra la build en modo local — 23/23 ✔: splash <1 s, validaciones, 3 hábitos independientes, nombre duplicado rechazado, cronómetro que sobrevive a recargas, pausa que no acumula, doble clic en «Finalizar» sin duplicar, duración correcta, rachas (varias sesiones el mismo día, hueco de 1 día, reinicio tras 3 días, mejor racha conservada), historial, editar, eliminar con confirmación, persistencia al reabrir el navegador, capturas tablet/escritorio.

## Limitaciones conocidas

- **No se ha probado contra un proyecto Supabase real** (no hay credenciales en este entorno): el código de `src/data/supabase.ts`, el esquema y las políticas RLS están escritos pero sin ejecutar. Hazlo tú siguiendo los pasos anteriores y prueba registrarte, crear un hábito y cronometrar.
- Las imágenes 3D de la referencia (teclado, botella) no se pueden reutilizar: se recrearon como ilustraciones SVG ligeras. El avatar muestra la inicial del nombre (no hay subida de foto).
- Los recordatorios se muestran en la tarjeta pero no envían notificaciones.
