import type { Backend } from './repo'
import { createCookieBackend } from './cookies'
import { createSupabaseBackend } from './supabase'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Por defecto los datos se guardan en cookies del navegador (no requiere configurar nada).
 * Si defines VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY se usa Supabase (cuentas + sincronización).
 */
export const backend: Backend = url && key ? createSupabaseBackend(url, key) : createCookieBackend()
