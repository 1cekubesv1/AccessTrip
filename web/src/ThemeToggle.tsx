import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'accesstrip-theme'

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark'
  } catch {
    /* localStorage / matchMedia unavailable — fall through */
  }
  return 'light'
}

// Runtime theme switcher: cream (light, default) ⇄ dark (indigo). Sets
// data-theme on <html>; the stylesheet's :root[data-theme='dark'] layer does the
// rest. Choice persists in localStorage; falls back to the OS preference.
export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore persistence failure */
    }
  }, [theme])

  const next: Theme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setTheme(next)}
      aria-label={`Basculer en thème ${next === 'dark' ? 'sombre' : 'clair'}`}
      title={`Thème ${theme === 'dark' ? 'sombre' : 'clair'} — cliquer pour ${next === 'dark' ? 'sombre' : 'clair'}`}
    >
      {theme === 'dark' ? (
        <Moon size={16} aria-hidden="true" />
      ) : (
        <Sun size={16} aria-hidden="true" />
      )}
      <span className="theme-toggle-label">{theme === 'dark' ? 'Sombre' : 'Clair'}</span>
    </button>
  )
}
