// Classroom login and saves. Login uses PixPy's roster (first name + last name). The game save
// always lives on the device too, so a slow school network never loses progress.
import { createClient } from '@supabase/supabase-js'
import type { SaveState } from '../types'

const supabaseUrl = 'https://imodobxbarcsjylvitxt.supabase.co'
const supabasePublishableKey = 'sb_publishable_jkHrLZkNR4Zh3XtHEgpTMA_JnMMpG6w'

const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
})

export function cleanUsername(value: string): string {
  return value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

export interface Login { username: string; displayName: string; isTeacher: boolean }

export async function login(value: string): Promise<Login> {
  const username = cleanUsername(value)
  if (username.length < 3) throw new Error('Type your first name and last name together, like anasilva.')
  const { data, error } = await supabase.rpc('pixpy_login', { p_username: username })
  if (error) throw new Error('Could not reach the classroom. Check the Wi-Fi and try again.')
  const payload = data as { ok?: boolean; username?: string; display_name?: string; is_teacher?: boolean } | null
  if (!payload?.ok || !payload.username || !payload.display_name) throw new Error('Login not found. Check your first name + last name.')
  return { username: cleanUsername(payload.username), displayName: payload.display_name, isTeacher: payload.is_teacher === true }
}

const localKey = (username: string) => `pyxies.save.${username}`
const sessionKey = 'pyxies.session'

export function rememberSession(user: Login | null) {
  try {
    if (user) localStorage.setItem(sessionKey, JSON.stringify(user))
    else localStorage.removeItem(sessionKey)
  } catch { /* private mode */ }
}

export function rememberedSession(): Login | null {
  try {
    const raw = localStorage.getItem(sessionKey)
    const parsed = raw ? JSON.parse(raw) as Login : null
    return parsed?.username ? parsed : null
  } catch {
    return null
  }
}

export function loadLocal(username: string): unknown {
  try {
    const raw = localStorage.getItem(localKey(username))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveLocal(save: SaveState) {
  try { localStorage.setItem(localKey(save.username), JSON.stringify(save)) } catch { /* storage full */ }
}

/** The cloud copy, or null when there is none or the cloud is not set up yet. */
export async function loadCloud(username: string): Promise<unknown> {
  try {
    const { data, error } = await supabase.rpc('pyxies_load', { p_username: username }).abortSignal(AbortSignal.timeout(8000))
    if (error) return null
    return data ?? null
  } catch {
    return null
  }
}

/** Picks whichever save has more play time: the device and the cloud can disagree. */
export function newestSave(local: unknown, cloud: unknown): unknown {
  const time = (value: unknown) => (value && typeof value === 'object' && typeof (value as SaveState).playMs === 'number') ? (value as SaveState).playMs : -1
  return time(cloud) > time(local) ? cloud : local
}

// Cloud saves are coalesced: only the newest save goes out, after a pause, one request at a time.
let pending: SaveState | null = null
let lastSent = ''
let timer: ReturnType<typeof setTimeout> | undefined
let sending = false
let failures = 0
let lastSendAt = 0
const MIN_GAP_MS = 30_000
type SyncState = 'saved' | 'saving' | 'offline'
const listeners = new Set<(state: SyncState) => void>()

function notify(state: SyncState) {
  listeners.forEach((listener) => listener(state))
}

export function onSync(listener: (state: SyncState) => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

async function drain() {
  timer = undefined
  if (sending || !pending) return
  const save = pending
  pending = null
  const content = JSON.stringify(save)
  if (content === lastSent) return
  sending = true
  lastSendAt = Date.now()
  notify('saving')
  try {
    const { data, error } = await supabase.rpc('pyxies_save', { p_username: save.username, p_save: save }).abortSignal(AbortSignal.timeout(12000))
    if (error || data !== true) throw new Error('not saved')
    lastSent = content
    failures = 0
    notify('saved')
  } catch {
    pending ??= save
    failures += 1
    notify('offline')
  } finally {
    sending = false
    if (pending) timer = setTimeout(drain, failures ? Math.min(60000, 5000 * failures) : MIN_GAP_MS)
  }
}

export function saveCloud(save: SaveState, soon = false) {
  saveLocal(save)
  if (save.username === 'leleomaker' || save.username === 'guest') return
  pending = save
  // At most one cloud write every 30 seconds per student, unless it matters right now.
  const wait = soon ? 300 : Math.max(3000, lastSendAt + MIN_GAP_MS - Date.now())
  if (timer !== undefined && soon) { clearTimeout(timer); timer = undefined }
  if (timer === undefined) timer = setTimeout(drain, wait)
}

export async function flushCloud() {
  if (timer !== undefined) clearTimeout(timer)
  await drain()
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') void flushCloud() })
}

export interface FameEntry { name: string; badges: number; xp: number; champion: boolean; caught: number }

export async function hallOfFame(): Promise<FameEntry[]> {
  try {
    const { data, error } = await supabase.rpc('pyxies_hall_of_fame').abortSignal(AbortSignal.timeout(8000))
    if (error || !Array.isArray(data)) return []
    return data as FameEntry[]
  } catch {
    return []
  }
}
