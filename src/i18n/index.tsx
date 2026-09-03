/* eslint-disable react-refresh/only-export-components -- locale helpers and the provider intentionally share one public module. */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import enCatalog from './locales/en'

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'it' | 'nl'
type SecondaryLocale = Exclude<Locale, 'en'>

export const LOCALES: ReadonlyArray<{ code: Locale; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'it', label: 'Italiano' },
  { code: 'nl', label: 'Nederlands' },
]

const STORAGE_KEY = 'KivaLensLocale'
const supported = new Set<Locale>(LOCALES.map(({ code }) => code))

type Params = Record<string, string | number>
type Catalog = Record<string, string>
const EMPTY_CATALOG: Catalog = {}

// Every UI string is keyed by a short symbolic key (e.g. 'set_lender_id'), never
// by its English text — see src/i18n/locales/*.ts. English is a peer locale
// file like the other five; it happens to be bundled eagerly (below) while the
// other five load on demand, purely as a startup-cost optimization for the
// overwhelmingly common case.
function loadCatalog(locale: SecondaryLocale): Promise<Catalog> {
  switch (locale) {
    case 'es': return import('./locales/es').then((m) => m.default)
    case 'fr': return import('./locales/fr').then((m) => m.default)
    case 'de': return import('./locales/de').then((m) => m.default)
    case 'it': return import('./locales/it').then((m) => m.default)
    case 'nl': return import('./locales/nl').then((m) => m.default)
  }
}

// Sector names come from Kiva's own API taxonomy (e.g. 'Agriculture'), not
// from KivaLens copy — English keys it are the external system's canonical
// identifiers, the same way a country or currency code would be, so unlike
// every t() key above there is no separate symbol to decouple them from.
const sectors: Record<SecondaryLocale, Record<string, string>> = {
  es: { Agriculture: 'Agricultura', Arts: 'Arte', 'Clean Energy': 'Energía limpia', Clothing: 'Ropa', Construction: 'Construcción', Education: 'Educación', Entertainment: 'Entretenimiento', Food: 'Alimentación', Health: 'Salud', Housing: 'Vivienda', Manufacturing: 'Manufactura', 'Personal Use': 'Uso personal', Retail: 'Comercio minorista', 'Reuse & Recycle': 'Reutilización y reciclaje', 'Sanitation & Hygiene': 'Saneamiento e higiene', Services: 'Servicios', Transportation: 'Transporte', Water: 'Agua', Wholesale: 'Comercio mayorista' },
  fr: { Agriculture: 'Agriculture', Arts: 'Arts', 'Clean Energy': 'Énergie propre', Clothing: 'Habillement', Construction: 'Construction', Education: 'Éducation', Entertainment: 'Divertissement', Food: 'Alimentation', Health: 'Santé', Housing: 'Logement', Manufacturing: 'Fabrication', 'Personal Use': 'Usage personnel', Retail: 'Commerce de détail', 'Reuse & Recycle': 'Réutilisation et recyclage', 'Sanitation & Hygiene': 'Assainissement et hygiène', Services: 'Services', Transportation: 'Transport', Water: 'Eau', Wholesale: 'Commerce de gros' },
  de: { Agriculture: 'Landwirtschaft', Arts: 'Kunst', 'Clean Energy': 'Saubere Energie', Clothing: 'Bekleidung', Construction: 'Bauwesen', Education: 'Bildung', Entertainment: 'Unterhaltung', Food: 'Lebensmittel', Health: 'Gesundheit', Housing: 'Wohnen', Manufacturing: 'Fertigung', 'Personal Use': 'Persönlicher Bedarf', Retail: 'Einzelhandel', 'Reuse & Recycle': 'Wiederverwendung & Recycling', 'Sanitation & Hygiene': 'Sanitärversorgung & Hygiene', Services: 'Dienstleistungen', Transportation: 'Transport', Water: 'Wasser', Wholesale: 'Großhandel' },
  it: { Agriculture: 'Agricoltura', Arts: 'Arte', 'Clean Energy': 'Energia pulita', Clothing: 'Abbigliamento', Construction: 'Edilizia', Education: 'Istruzione', Entertainment: 'Intrattenimento', Food: 'Alimentazione', Health: 'Salute', Housing: 'Abitazione', Manufacturing: 'Produzione', 'Personal Use': 'Uso personale', Retail: 'Commercio al dettaglio', 'Reuse & Recycle': 'Riuso e riciclo', 'Sanitation & Hygiene': 'Servizi igienici e igiene', Services: 'Servizi', Transportation: 'Trasporti', Water: 'Acqua', Wholesale: 'Commercio all’ingrosso' },
  nl: { Agriculture: 'Landbouw', Arts: 'Kunst', 'Clean Energy': 'Schone energie', Clothing: 'Kleding', Construction: 'Bouw', Education: 'Onderwijs', Entertainment: 'Entertainment', Food: 'Voeding', Health: 'Gezondheid', Housing: 'Huisvesting', Manufacturing: 'Productie', 'Personal Use': 'Persoonlijk gebruik', Retail: 'Detailhandel', 'Reuse & Recycle': 'Hergebruik & recycling', 'Sanitation & Hygiene': 'Sanitatie & hygiëne', Services: 'Diensten', Transportation: 'Vervoer', Water: 'Water', Wholesale: 'Groothandel' },
}

export function translate(
  locale: Locale,
  key: string,
  params: Params = {},
  catalog: Catalog = EMPTY_CATALOG,
): string {
  // Null-safe: callers sometimes pass a nullable data field (e.g. t(loan.activity),
  // which is null on some backends' loans); never throw on missing keys.
  if (key == null) return ''
  const template = locale === 'en' ? (enCatalog as Catalog)[key] ?? key : catalog[key] ?? (enCatalog as Catalog)[key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name] ?? `{${name}}`))
}

// Every locale file is generated from the same key set (see
// scripts/generate-i18n.mjs's parity check), so a key that exists in English
// exists everywhere — this checks the one catalog that's always loaded.
export function hasTranslation(_locale: Locale, key: string): boolean {
  return key in enCatalog
}

export function formatRelativeTime(locale: Locale, value: Date | string | number, now = Date.now()): string {
  const difference = new Date(value).getTime() - now
  const absolute = Math.abs(difference)
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['year', 365 * 24 * 60 * 60 * 1000],
    ['month', 30 * 24 * 60 * 60 * 1000],
    ['week', 7 * 24 * 60 * 60 * 1000],
    ['day', 24 * 60 * 60 * 1000],
    ['hour', 60 * 60 * 1000],
    ['minute', 60 * 1000],
  ]
  const [unit, size] = units.find(([, unitSize]) => absolute >= unitSize) ?? ['second', 1000]
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(Math.round(difference / size), unit)
}

export function translateSector(locale: Locale, englishSector: string): string {
  return locale === 'en' ? englishSector : sectors[locale][englishSector] ?? englishSector
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && supported.has(saved)) return saved
  } catch {
    // Fall through to browser preference.
  }
  const browser = window.navigator.language?.split('-')[0] as Locale | undefined
  return browser && supported.has(browser) ? browser : 'en'
}

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, params?: Params) => string
  sector: (englishSector: string) => string
  relativeTime: (value: Date | string | number, now?: number) => string
  date: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
}

const I18nContext = createContext<I18nValue>({
  locale: 'en',
  setLocale: () => {},
  t: (key, params) => translate('en', key, params),
  sector: (value) => value,
  relativeTime: (value, now) => formatRelativeTime('en', value, now),
  date: (value, options) => new Intl.DateTimeFormat('en', options).format(new Date(value)),
})

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale)
  const [loadedCatalog, setLoadedCatalog] = useState<{
    locale: SecondaryLocale
    catalog: Catalog
  } | null>(null)
  const setLocale = useCallback((next: Locale) => {
    if (!supported.has(next)) return
    setLocaleState(next)
    try { window.localStorage.setItem(STORAGE_KEY, next) } catch { /* ignore */ }
  }, [])
  useEffect(() => {
    document.documentElement.lang = locale
    if (locale === 'en') return
    let active = true
    const secondaryLocale = locale as SecondaryLocale
    void loadCatalog(secondaryLocale).then((catalog) => {
      if (active) setLoadedCatalog({ locale: secondaryLocale, catalog })
    })
    return () => { active = false }
  }, [locale])
  const activeCatalog =
    locale !== 'en' && loadedCatalog?.locale === locale ? loadedCatalog.catalog : EMPTY_CATALOG
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, params) => translate(locale, key, params, activeCatalog),
    sector: (englishSector) => translateSector(locale, englishSector),
    relativeTime: (input, now) => formatRelativeTime(locale, input, now),
    date: (input, options) => new Intl.DateTimeFormat(locale, options).format(new Date(input)),
  }), [activeCatalog, locale, setLocale])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  return useContext(I18nContext)
}
