/**
 * canonicalUrl.mjs — the one public origin for the site.
 *
 * The site is served at https://www.kivalens.org. Heroku's router terminates
 * TLS and reports the original scheme in x-forwarded-proto, so a request can
 * arrive over plain HTTP or on the bare apex (kivalens.org); either one gets a
 * single permanent redirect to the canonical origin, keeping path and query.
 * Other hostnames (the herokuapp.com name, local development) are left alone
 * apart from the HTTPS upgrade.
 */

export const CANONICAL_HOST = process.env.CANONICAL_HOST || 'www.kivalens.org'
const APEX_HOST = CANONICAL_HOST.replace(/^www\./, '')

/**
 * Location for a redirect to the canonical origin, or null when the request
 * is already there (or carries no Host to build a URL from).
 */
export function canonicalRedirect(req) {
  const host = String(req.headers?.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '')
  if (!host) return null
  const insecure = req.headers?.['x-forwarded-proto'] === 'http'
  const onApex = host === APEX_HOST
  if (!insecure && !onApex) return null
  return `https://${onApex ? CANONICAL_HOST : host}${req.url || '/'}`
}
