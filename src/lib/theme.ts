export type ThemePref = 'dark' | 'light' | 'system'

const COOKIE = 'shift_theme'
const MAX_AGE = 60 * 60 * 24 * 400

export function getThemePref(): ThemePref {
  const m = document.cookie.split('; ').find((c) => c.startsWith(COOKIE + '='))
  const v = m?.slice(COOKIE.length + 1)
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark'
}

export function resolveTheme(pref: ThemePref): 'dark' | 'light' {
  if (pref === 'system') return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  return pref
}

export function applyTheme(pref: ThemePref) {
  const t = resolveTheme(pref)
  document.documentElement.setAttribute('data-theme', t)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'light' ? '#f3f2f6' : '#1b1b1f')
}

export function setThemePref(pref: ThemePref) {
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${COOKIE}=${pref}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
  applyTheme(pref)
}

/** Si la preferencia es «sistema», reacciona a los cambios del sistema operativo. */
export function watchSystemTheme(): () => void {
  const mq = window.matchMedia('(prefers-color-scheme: light)')
  const on = () => getThemePref() === 'system' && applyTheme('system')
  mq.addEventListener('change', on)
  return () => mq.removeEventListener('change', on)
}
