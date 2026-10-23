#!/usr/bin/env node
// Backport one canonical copy role without replacing the retained web-dialog contract.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const KEY = 'feedback.email.label'
const LOCALES = ['en', 'de', 'fr', 'es', 'pt-BR', 'ja', 'zh-Hans']

export function projectEmailCopy(bytes) {
  const source = JSON.parse(bytes)
  const entry = source.strings?.[KEY]
  if (!source.version || !entry) throw new Error('Canonical feedback.email.label is missing')
  const values = { en: entry.en, ...entry.translations }
  const labels = Object.fromEntries(LOCALES.map(locale => {
    if (typeof values[locale] !== 'string' || !values[locale].trim()) throw new Error('Missing canonical email label: ' + locale)
    return [locale, values[locale]]
  }))
  return {
    canonical: 'humansareuseful/shared-support-and-more-apps/definition/strings.json',
    version: source.version,
    sourceSha256: 'sha256:' + createHash('sha256').update(bytes).digest('hex'),
    strings: { [KEY]: labels },
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const canonical = process.argv[2]
  if (!canonical || canonical.startsWith('--')) throw new Error('Usage: node scripts/sync-support-email-copy.mjs CANONICAL_ROOT [--check]')
  const bytes = readFileSync(path.join(canonical, 'definition/strings.json'), 'utf8')
  const output = JSON.stringify(projectEmailCopy(bytes), null, 2) + '\n'
  const target = new URL('../src/support/shared-email-copy.generated.json', import.meta.url)
  if (process.argv.includes('--check')) {
    if (readFileSync(target, 'utf8') !== output) throw new Error('Canonical email-copy amendment is stale; run the sync command')
    console.log('Canonical email-copy amendment matches')
  } else {
    writeFileSync(target, output)
    console.log('Updated only the canonical email-copy amendment')
  }
}
