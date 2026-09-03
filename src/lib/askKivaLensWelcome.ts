// The "Need help getting started?" CTA always sends this EXACT prompt. The widget
// short-circuits it client-side and replies with WELCOME_REPLY instead of making
// an OpenAI call, so simply clicking the button never costs credits. Keep the
// prompt here (single source of truth) so the CTA and the short-circuit match.
export const WELCOME_PROMPT = 'welcome_prompt'

export const WELCOME_REPLY =
  'welcome_reply'
