// Records what Kiva and Google really answer, for the tests of the code that talks to them.
//
// Tests of an integration are only as good as their idea of the other side. Twice in October 2026 a mock
// written from assumption hid a production bug: test listings carried loan terms Kiva's listing does not
// have, and test answers from Kiva's graph calls were labelled JSON when Kiva labels them text/html. These
// files hold the real answers instead, status and headers included, and the tests read them.
//
// Run it whenever code that talks to Kiva or Google changes, and commit what changed:
//   node scripts/record-upstream-fixtures.mjs [--lender <public id>] [--team <id>]
// It asks the way the app itself asks: the proxy's own headers for Kiva's graph calls, the server's own
// fetchSearchPage and fetchDetailBatch for Kiva's loan API (their bodies only), plain requests for Google.
// Nothing here is paid. A file whose source answered with an error status is not written: the run stops and
// says so, because an error page is not what the tests are meant to know.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { KIVA_AJAX_HEADERS, RESEARCH_SHEET_ID, fetchSearchPage, fetchDetailBatch } from '../server/klCore.mjs'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'test', 'fixtures', 'upstream')
const opt = (name, fallback) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : fallback }
// The maintainer's public lender page: lifetime figures for every slice, and an empty active portfolio (its loans have ended).
const LENDER = opt('--lender', 'nuclearspike')
const TEAM = opt('--team', '1')
const recordedAt = new Date().toISOString()
const written = []

function save(name, record) {
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, name), JSON.stringify({ recordedAt, ...record }, null, 2) + '\n')
  written.push(name)
}

const KEPT_HEADERS = ['content-type', 'location', 'cache-control']
const headersOf = (res) => Object.fromEntries(KEPT_HEADERS.filter((h) => res.headers.get(h) != null).map((h) => [h, res.headers.get(h)]))

async function kivaAjax(name, pathAndQuery, cut) {
  const url = `https://www.kiva.org/${pathAndQuery}`
  const res = await fetch(url, { headers: KIVA_AJAX_HEADERS, signal: AbortSignal.timeout(20_000) })
  let body = await res.text()
  if (!res.ok) throw new Error(`${url} answered ${res.status}: not recorded`)
  let note
  if (cut) ({ body, note } = cut(body))
  save(name, { source: url.replace(LENDER, '<lender>'), how: 'fetched with the proxy\'s own request headers (KIVA_AJAX_HEADERS)', status: res.status, headers: headersOf(res), body, ...(note ? { cut: note } : {}) })
}

// Kiva's graph calls: real status, real labels, real bodies.
await kivaAjax('kiva-supergraph-partner-all.json', `ajax/getSuperGraphData?sliceBy=partner&include=all&measure=count&subject_id=${LENDER}&type=lender&granularity=cumulative`, (body) => {
  const j = JSON.parse(body)
  const keep = j.data.slice(0, 8)
  const lookup = Object.fromEntries(keep.map((d) => [d.name, j.lookup[d.name]]))
  return { body: JSON.stringify({ ...j, lookup, data: keep }), note: `the ${keep.length} largest of ${j.data.length} partners, re-serialised` }
})
await kivaAjax('kiva-supergraph-country-active-empty.json', `ajax/getSuperGraphData?sliceBy=country&include=active&measure=count&subject_id=${LENDER}&type=lender&granularity=cumulative`)
await kivaAjax('kiva-graphdata-team.json', `ajax/getGraphData?graphName=team_loan_count&id=${encodeURIComponent(TEAM)}`, (body) => {
  const j = JSON.parse(body)
  return { body: JSON.stringify({ ...j, graphData: j.graphData.slice(0, 12) }), note: `the first 12 of ${j.graphData.length} points, re-serialised` }
})

// Kiva's loan API, through the server's own functions: a listing entry and the same loan's detail.
const page = await fetchSearchPage(1)
const listed = page.loans.slice(0, 3)
const details = await fetchDetailBatch(listed.map((l) => l.id))
save('kiva-search-page.json', { source: 'https://api.kivaws.org/v1/loans/search.json?status=fundraising&page=1', how: 'the server\'s fetchSearchPage(1); body only', loans: listed, cut: `the first ${listed.length} of ${page.loans.length} loans` })
save('kiva-loan-details.json', { source: 'https://api.kivaws.org/v1/loans/<ids>.json', how: 'the server\'s fetchDetailBatch for the loans in kiva-search-page.json; body only', loans: details })

// The research sheet: Google redirects to a content host, which sends CSV.
{
  const url = `https://docs.google.com/spreadsheets/d/${RESEARCH_SHEET_ID}/export?gid=1&format=csv`
  const first = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(20_000) })
  await first.body?.cancel().catch(() => {})
  const location = first.headers.get('location')
  if (![301, 302, 303, 307, 308].includes(first.status) || !location) throw new Error(`${url} answered ${first.status} without a redirect: not recorded`)
  const to = new URL(location)
  const final = await fetch(location, { signal: AbortSignal.timeout(20_000) })
  const csv = await final.text()
  if (!final.ok) throw new Error(`the sheet's content host answered ${final.status}: not recorded`)
  save('google-sheet-export.json', {
    source: url,
    how: 'plain requests; the redirect target\'s path keeps its shape, its tokens and account number replaced',
    redirect: { status: first.status, location: `${to.origin}${to.pathname.replace(/^\/export\/[^/]+\/[^/]+\/(\d+)\/\d+\//, '/export/<token>/<token>/$1/<number>/')}${to.search}` },
    status: final.status,
    headers: headersOf(final),
    body: csv.split('\n').slice(0, 4).join('\n'),
    cut: `the first 3 rows of ${csv.split('\n').length - 1}`,
  })
}

console.log(`recorded ${written.length} files in ${path.relative(process.cwd(), OUT)}: ${written.join(', ')}`)
