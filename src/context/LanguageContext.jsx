import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { translations } from '../i18n/translations'

const STORAGE_KEY = 'confera_lang'
const SUPPORTED_LANGS = ['fr', 'en', 'ar']
const DEFAULT_LANG = 'fr'

const LanguageContext = createContext(null)

function readStoredLang() {
  if (typeof window === 'undefined') return DEFAULT_LANG
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return SUPPORTED_LANGS.includes(saved) ? saved : DEFAULT_LANG
  } catch {
    return DEFAULT_LANG
  }
}

function resolveKey(obj, key) {
  if (!obj || !key) return undefined
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj)
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(readStoredLang)

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    try {
      window.localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore storage errors
    }
  }, [lang])

  const setLang = useCallback((nextLang) => {
    if (SUPPORTED_LANGS.includes(nextLang)) {
      setLangState(nextLang)
    }
  }, [])

  const t = useCallback(
    (key, vars) => {
      const value =
        resolveKey(translations[lang], key) ??
        resolveKey(translations[DEFAULT_LANG], key) ??
        key
      if (typeof value !== 'string' || !vars) return value
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
        value
      )
    },
    [lang]
  )

  const value = useMemo(
    () => ({
      lang,
      setLang,
      isRtl: lang === 'ar',
      locale: lang === 'ar' ? 'ar-DZ' : lang === 'en' ? 'en-US' : 'fr-FR',
      t,
    }),
    [lang, setLang, t]
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return ctx
}
