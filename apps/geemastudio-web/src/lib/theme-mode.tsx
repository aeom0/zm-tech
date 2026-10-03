'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'geema-theme'

/**
 * Script inline (sin flash) que aplica la clase `dark` en <html> antes de pintar.
 * Debe mantenerse en sincronía con `applyTheme`.
 */
export const THEME_INIT_SCRIPT = `try{var p=localStorage.getItem('${THEME_STORAGE_KEY}');if(p!=='light'&&p!=='dark')p='system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#0F0F0F':'#FAFAFA')}catch(e){}`

const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#0F0F0F', light: '#FAFAFA' }

function readPreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): ResolvedTheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute('content', THEME_COLORS[resolved]))
}

type ThemeContextValue = {
  preference: ThemePreference
  resolved: ResolvedTheme
  setPreference: (next: ThemePreference) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // El SSR no conoce la preferencia: se hidrata en el cliente (el script inline ya pintó bien).
  const [preference, setPreferenceState] = useState<ThemePreference>('system')
  const [resolved, setResolved] = useState<ResolvedTheme>('dark')

  useEffect(() => {
    const pref = readPreference()
    setPreferenceState(pref)
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => {
      const next = pref === 'system' ? systemTheme() : pref
      setResolved(next)
      applyTheme(next)
    }
    sync()
    if (pref !== 'system') return
    mql.addEventListener('change', sync)
    return () => mql.removeEventListener('change', sync)
  }, [])

  // Al salir del shell, <html> vuelve a su estado neutro (las páginas públicas gestionan su tema).
  useEffect(() => {
    return () => {
      const root = document.documentElement
      root.classList.remove('dark')
      root.style.colorScheme = ''
    }
  }, [])

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* almacenamiento bloqueado: el cambio vale solo para esta sesión */
    }
    setPreferenceState(next)
    const r = next === 'system' ? systemTheme() : next
    setResolved(r)
    applyTheme(r)
  }, [])

  // Si la preferencia pasa a "system" desde un modo fijo, hay que volver a escuchar el SO.
  useEffect(() => {
    if (preference !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const r = systemTheme()
      setResolved(r)
      applyTheme(r)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [preference])

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference]
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider')
  return ctx
}
