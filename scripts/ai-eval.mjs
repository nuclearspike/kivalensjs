import { readFile } from 'node:fs/promises'
import { gzipSync } from 'node:zlib'
import dotenv from 'dotenv'
import OpenAI from 'openai'
import { buildResponsesRequest, buildSystemPrompt, execTool } from '../server/aiChat.mjs'

dotenv.config({ path: '.env.local' })
dotenv.config()

const dryRun = process.argv.includes('--dry-run')
const cases = JSON.parse(await readFile(new URL('../evals/ask-kivalens.json', import.meta.url), 'utf8'))

function validateCase(test) {
  if (!test?.id || !test?.input) throw new Error('Every eval needs id and input')
  for (const field of ['expectedTools', 'forbiddenTools', 'argumentIncludes', 'forbiddenText', 'requiredText']) {
    if (test[field] != null && !Array.isArray(test[field])) throw new Error(`${test.id}: ${field} must be an array`)
  }
}

for (const test of cases) validateCase(test)
if (dryRun) {
  console.log(`[ai-eval] ${cases.length} cases valid (dry run; no API calls)`)
  process.exit(0)
}

if (!process.env.OPENAI_API_KEY) {
  console.error('[ai-eval] OPENAI_API_KEY is required (or run npm run eval:ai:dry)')
  process.exit(2)
}

const sectors = [
  'Agriculture', 'Arts', 'Clean Energy', 'Clothing', 'Construction', 'Education',
  'Entertainment', 'Food', 'Health', 'Housing', 'Manufacturing', 'Personal Use',
  'Retail', 'Reuse & Recycle', 'Sanitation & Hygiene', 'Services', 'Transportation',
  'Water', 'Wholesale',
]
const mkEvalLoan = (o) => ({
  status: 'fundraising',
  funded_amount: 0,
  loan_amount: 1000,
  partner_id: 10,
  location: { country_code: 'JO', country: 'Jordan' },
  terms: { repayment_interval: 'monthly' },
  kls_tags: [],
  themes: [],
  borrower_count: 1,
  kl_percent_women: 100,
  kl_still_needed: 500,
  kl_percent_funded: 50,
  kl_name_arr: [],
  kls_use_or_descr_arr: [],
  kl_newest_sort: 0,
  posted_date: '2026-06-01',
  sector: 'Services',
  ...o,
})

// Built fresh per case: the harness executes real tools, so a shared object
// would let one case's mutations leak into the next.
const makeState = () => ({
  batch: 1,
  ready: true,
  // Tools gate on this (not `ready`): without it every tool result is the
  // "still loading" branch, which is not what these cases mean to exercise
  // and bleeds loading language into the replies they assert on.
  filterableLoans: true,
  // A few representative loans: with an EMPTY set the prompt tells the model no
  // loans are loaded, so it declines to act and every behavioural case is
  // vacuous. These make "find me X" requests answerable, which is what the
  // apply-the-filter cases actually test.
  allLoans: [
    mkEvalLoan({ id: 1, sector: 'Services', location: { country_code: 'JO', country: 'Jordan' } }),
    mkEvalLoan({ id: 2, sector: 'Retail', location: { country_code: 'JO', country: 'Jordan' } }),
    mkEvalLoan({ id: 3, sector: 'Food', location: { country_code: 'LB', country: 'Lebanon' } }),
    mkEvalLoan({ id: 4, sector: 'Agriculture', location: { country_code: 'PE', country: 'Peru' }, kl_percent_women: 0 }),
    mkEvalLoan({ id: 5, sector: 'Retail', location: { country_code: 'PH', country: 'Philippines' }, kl_percent_women: 0 }),
  ],
  activePartners: [
    { id: 10, status: 'active', kl_regions: ['me'], kl_sp: [], countries: [{ iso_code: 'JO' }, { iso_code: 'LB' }], rating: 5 },
  ],
  partners: [],
  atheistListProcessed: false,
  optionsGz: gzipSync(Buffer.from(JSON.stringify({ sectors, activities: [], themes: [], tags: [] }))),
})
// A case may seed its own `lenderId` / `criteria` (e.g. portfolio-exclusion
// behaviour depends on both); everything else shares the default prompt.
const promptFor = (test, st) =>
  buildSystemPrompt(st, test.lenderId ?? null, test.criteria ?? { loan: {}, partner: {}, portfolio: {} }, {
    shown: st.allLoans.length,
    total: st.allLoans.length,
    page: 'the Search page',
    basket: [],
    savedSearches: [],
  })
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
let passed = 0

for (const test of cases) {
  const state = makeState()
  const instructions = promptFor(test, state)
  const input = [{ role: 'user', content: test.input }]
  const response = await client.responses.create({
    ...buildResponsesRequest({ instructions, input, clientId: `eval-${test.id}` }),
    stream: false,
    max_output_tokens: 500,
  })
  const calls = (response.output || []).filter((item) => item.type === 'function_call')
  const toolNames = calls.map((call) => call.name)
  const args = calls.map((call) => call.arguments || '').join('\n')
  let text = response.output_text || ''
  let answerText = text

  // A turn that calls a tool has no user-visible text yet, so every
  // forbiddenText/requiredText assertion would silently pass on it. Run the
  // tool results back through the model the way handleChat does, and assert
  // against the reply the user actually reads.
  if (calls.length) {
    const sctx = {
      state,
      lenderId: test.lenderId ?? null,
      criteria: test.criteria ?? { loan: {}, partner: {}, portfolio: {} },
      applicationStorage: {},
    }
    const followUp = [...input, ...(response.output || [])]
    for (const call of calls) {
      let result
      try {
        result = await execTool(call.name, call.arguments ? JSON.parse(call.arguments) : {}, sctx, () => {})
      } catch (e) {
        result = { error: 'tool_failed', message: String(e?.message ?? e) }
      }
      let output
      try { output = JSON.stringify(result) } catch { output = JSON.stringify({ error: 'unserializable_tool_result' }) }
      followUp.push({ type: 'function_call_output', call_id: call.call_id, output })
    }
    const final = await client.responses.create({
      ...buildResponsesRequest({ instructions, input: followUp, lastRound: true, clientId: `eval-${test.id}` }),
      stream: false,
      max_output_tokens: 500,
    })
    // Both turns are shown to the user (round-1 text streams before the tools
    // run), so `text` — what forbiddenText scans — is everything they read: a
    // clean final sentence must not mask a forbidden offer made alongside the
    // tool call. requiredText keeps asserting the ANSWER only, so a phrase in
    // the pre-tool preamble cannot satisfy it for a final reply that omits it.
    answerText = final.output_text || ''
    text = [text, answerText].filter(Boolean).join('\n')
  }
  const failures = []

  for (const expected of test.expectedTools || []) {
    if (!toolNames.includes(expected)) failures.push(`missing tool ${expected}; got ${toolNames.join(', ') || '(none)'}`)
  }
  for (const forbidden of test.forbiddenTools || []) {
    if (toolNames.includes(forbidden)) failures.push(`called forbidden tool ${forbidden}`)
  }
  for (const fragment of test.argumentIncludes || []) {
    if (!args.toLowerCase().includes(String(fragment).toLowerCase())) failures.push(`tool args missing ${fragment}`)
  }
  for (const pattern of test.forbiddenText || []) {
    if (new RegExp(pattern, 'i').test(text)) failures.push(`forbidden text matched /${pattern}/i`)
  }
  for (const pattern of test.requiredText || []) {
    if (!new RegExp(pattern, 'i').test(answerText)) failures.push(`required text missing /${pattern}/i`)
  }

  if (failures.length) {
    console.error(`✗ ${test.id}: ${failures.join('; ')}`)
    // Show what actually came back — a bare "missing tool X" is not diagnosable.
    console.error(`    tools: ${toolNames.join(', ') || '(none)'}`)
    if (text) console.error(`    text: ${text.replace(/\s+/g, ' ').slice(0, 220)}`)
  } else {
    passed++
    console.log(`✓ ${test.id}`)
  }
}

console.log(`[ai-eval] ${passed}/${cases.length} passed`)
if (passed !== cases.length) process.exit(1)
