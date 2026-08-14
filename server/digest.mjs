/**
 * digest.mjs — build + send the daily "Ask KivaLens" interaction digest,
 * grouped by user (clientId, labelled with lenderId when known), chronological.
 */
import { getDayLogs, claimDigest, clearLogsThrough } from './aiUsage.mjs'
import { sendEmail, emailConfigured } from './email.mjs'

const TO = process.env.DIGEST_TO || 'contact@kivalens.org'
// Display all digest times in Mountain Time (auto MST/MDT via the IANA zone).
const DIGEST_TZ = process.env.DIGEST_TZ || 'America/Denver'

function fmtTime(at) {
  const d = new Date(at)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-US', {
    timeZone: DIGEST_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  })
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

/**
 * Turns where the assistant filed a bug report. Most users have no GitHub
 * account, so the chat is the only channel they have — and a report rendered
 * like every other turn is a report that gets missed (a "my saved searches are
 * gone" report once sat inside a 103-chat digest, formatted exactly like "can
 * you make them pink"). These get hoisted above the per-user log.
 */
export function bugReports(logs) {
  return (logs || []).filter((e) => (e.tools || []).some((t) => t?.name === 'report_bug'))
}

function bugSection(reports) {
  if (!reports.length) return ''
  let html =
    `<div style="margin:16px 0;padding:12px 14px;border:2px solid #c0392b;border-radius:6px;background:#fdf3f2">` +
    `<h3 style="margin:0 0 8px;color:#c0392b">⚠️ ${reports.length} bug report(s)</h3>`
  for (const r of reports) {
    const who = r.lenderId ? `lender ${esc(r.lenderId)}` : esc(r.clientId || 'anonymous')
    // The report text lives in the tool call's arguments; fall back to the
    // user's own words so a malformed call still shows something actionable.
    const call = (r.tools || []).find((t) => t?.name === 'report_bug')
    // args is stored as a JSON STRING truncated to 300 chars, so it may not
    // parse; fall back to the user's own words rather than showing nothing.
    const a = (() => {
      const raw = call && (call.args ?? call.arguments)
      if (!raw) return {}
      if (typeof raw === 'object') return raw
      try { return JSON.parse(raw) } catch { return {} }
    })()
    const detail = [a.summary, a.actual && `actual: ${a.actual}`, a.expected && `expected: ${a.expected}`, a.where && `where: ${a.where}`]
      .filter(Boolean)
      .join(' · ')
    html +=
      `<div style="margin:0 0 8px">` +
      `<div style="color:#888;font-size:12px">${esc(fmtTime(r.at))} · ${who}</div>` +
      `<div>${esc(detail || r.userMessage)}</div>` +
      `</div>`
  }
  return `${html}</div>`
}

export function buildDigestHtml(day, logs) {
  const groups = new Map()
  for (const e of logs) {
    const key = e.clientId || e.lenderId || 'anonymous'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(e)
  }
  let totalCost = 0
  for (const e of logs) totalCost += Number(e.costUsd) || 0

  let html =
    `<div style="font-family:system-ui,Arial,sans-serif;max-width:760px">` +
    `<h2 style="color:#2C8C5E">Ask KivaLens — ${esc(day)}</h2>` +
    `<p>${logs.length} interactions · ${groups.size} users · est. cost $${totalCost.toFixed(4)}</p>` +
    bugSection(bugReports(logs))

  // Oldest-active user first; turns within a user chronological.
  const ordered = [...groups.entries()].sort(
    (a, b) =>
      Math.min(...a[1].map((x) => Date.parse(x.at) || Infinity)) -
      Math.min(...b[1].map((x) => Date.parse(x.at) || Infinity)),
  )
  for (const [key, items] of ordered) {
    items.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')))
    const lender = items.find((i) => i.lenderId)?.lenderId
    html +=
      `<h3 style="margin-top:24px;border-bottom:1px solid #ddd;padding-bottom:4px">` +
      `User ${esc(key)}${lender ? ` (lender ${esc(lender)})` : ''} — ${items.length} turn(s)</h3>`
    for (const it of items) {
      const time = fmtTime(it.at)
      const tools = (it.tools || []).map((t) => t.name).join(', ')
      html +=
        `<div style="margin:0 0 12px;padding:8px 10px;border-left:3px solid #2C8C5E;background:#f7faf8">` +
        `<div style="color:#888;font-size:12px">${esc(time)}${it.page ? ` · ${esc(it.page)}` : ''}${tools ? ` · tools: ${esc(tools)}` : ''}</div>` +
        `<div style="margin-top:4px"><b>User:</b> ${esc(it.userMessage)}</div>` +
        `<div style="margin-top:2px"><b>KivaLens:</b> ${esc(it.response)}</div>` +
        `</div>`
    }
  }
  html += `</div>`
  return html
}

// Manual send (admin test): skips the once-a-day claim, returns the send result.
/** ", 2 bug reports" — so the inbox line alone shows something needs attention. */
export function subjectSuffix(logs) {
  const n = bugReports(logs).length
  return n ? `, ${n} bug report${n === 1 ? '' : 's'}` : ''
}

export async function sendDigestNow(day, log = console.log) {
  if (!emailConfigured()) return { ok: false, error: 'RESEND_API_KEY not set' }
  const logs = await getDayLogs(day)
  const html = buildDigestHtml(day, logs)
  const r = await sendEmail({ to: TO, subject: `Ask KivaLens digest (test) — ${day} (${logs.length} chats${subjectSuffix(logs)})`, html })
  log(`[digest] manual ${day}: ${r.ok ? `sent to ${TO}` : `failed — ${r.error}`}`)
  return { ...r, day, to: TO, interactions: logs.length }
}

export async function sendDailyDigest(day, log = console.log) {
  if (!emailConfigured()) return
  // Claim first so only one dyno sends, exactly once per day.
  if (!(await claimDigest(day))) return
  const logs = await getDayLogs(day)
  if (!logs.length) {
    log(`[digest] ${day}: no interactions, nothing to send`)
    return
  }
  const html = buildDigestHtml(day, logs)
  const r = await sendEmail({ to: TO, subject: `Ask KivaLens digest — ${day} (${logs.length} chats${subjectSuffix(logs)})`, html })
  log(`[digest] ${day}: ${r.ok ? `sent to ${TO}` : `failed — ${r.error}`}`)
  // Redis is tight: once the day is emailed, wipe the chats it covered.
  if (r.ok) {
    await clearLogsThrough(day)
    log(`[digest] ${day}: wiped logged chats through ${day}`)
  }
}
