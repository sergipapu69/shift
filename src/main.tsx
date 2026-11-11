import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/outfit'
import App from './App'
import './styles/app.css'
import { applyTheme, getThemePref, watchSystemTheme } from './lib/theme'

applyTheme(getThemePref())
watchSystemTheme()

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// El splash es CSS puro (≈0.95 s en total); aquí solo se retira del DOM al terminar.
const splash = document.getElementById('splash')
if (splash) {
  splash.addEventListener('animationend', (e) => e.target === splash && splash.remove())
  setTimeout(() => splash.remove(), 1200) // respaldo
}
