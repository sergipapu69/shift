import type { Backend } from './repo'
import { createSupabaseBackend } from './supabase'
import { createLocalBackend } from './local'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const mode = import.meta.env.VITE_DATA_MODE as string | undefined

export const isConfigured = Boolean(url && key) || mode === 'local'

export const backend: Backend | null =
  mode === 'local' ? createLocalBackend() : url && key ? createSupabaseBackend(url, key) : null
