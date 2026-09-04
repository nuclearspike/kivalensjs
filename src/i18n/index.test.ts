import { describe, expect, it } from 'vitest'
import { LOCALES, matchLocale, translate, translateData, translateSector } from './index'
import es from './locales/es'
import fr from './locales/fr'
import de from './locales/de'

describe('KivaLens localization', () => {
  it('offers the requested languages in their own language', () => {
    expect(LOCALES.map((locale) => locale.label)).toEqual([
      'English', 'Español', 'Français', 'Deutsch', 'Italiano', 'Nederlands', 'Português (Brasil)', '日本語', '简体中文',
    ])
  })

  it('interpolates localized chrome', () => {
    // translate() takes the loaded locale catalog as its 4th arg, matching how
    // useI18n()'s t() really calls it (I18nProvider passes the async-loaded
    // catalog once it resolves) — a bare 3-arg call only ever sees English.
    expect(translate('es', 'showing_shown_total_fundraising_loans', { shown: 3, total: 10 }, es))
      .toBe('Mostrando 3 de 10 préstamos en recaudación')
  })

  it('localizes Kiva data vocabulary by its canonical English name, passing unknown values through', () => {
    expect(translateSector('de', 'Agriculture', de)).toBe('Landwirtschaft')
    expect(translateSector('fr', 'Clean Energy', fr)).toBe('Énergie propre')
    expect(translateSector('es', 'Future Kiva Sector', es)).toBe('Future Kiva Sector')
    expect(translateSector('en', 'Retail')).toBe('Retail')
    // The same lookup serves activities, countries and repayment intervals.
    expect(translateData('es', 'Bakery', es)).not.toBe('Bakery')
    expect(translateData('de', 'Monthly', de)).not.toBe('Monthly')
    expect(translateData('fr', 'Uzbekistan', fr)).toBe('Ouzbékistan')
  })

  it('resolves browser language tags to a supported locale with region fallbacks', () => {
    expect(matchLocale('en-GB')).toBe('en')
    expect(matchLocale('de-AT')).toBe('de')
    expect(matchLocale('pt')).toBe('pt-BR')
    expect(matchLocale('pt-PT')).toBe('pt-BR')
    expect(matchLocale('pt-br')).toBe('pt-BR')
    expect(matchLocale('zh')).toBe('zh-Hans')
    expect(matchLocale('zh-CN')).toBe('zh-Hans')
    expect(matchLocale('zh-Hans-SG')).toBe('zh-Hans')
    expect(matchLocale('ja-JP')).toBe('ja')
    // Traditional-script Chinese routes to the only Chinese offered, not to English.
    expect(matchLocale('zh-TW')).toBe('zh-Hans')
    expect(matchLocale('zh-Hant-HK')).toBe('zh-Hans')
    expect(matchLocale('xx')).toBeUndefined()
    expect(matchLocale(undefined)).toBeUndefined()
    // An ordered preference list picks the first supported entry.
    expect(matchLocale(['xx', 'ja', 'en'])).toBe('ja')
    expect(matchLocale(['fy', 'nl-NL'])).toBe('nl')
  })
})
