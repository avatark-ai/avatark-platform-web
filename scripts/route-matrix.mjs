#!/usr/bin/env node
// AVK-PROD-03A (C7) / AVK-PROD-03B (CD-2, X-1): runtime route / security matrix against a running `next start` (T3, T3b, T3c,
// T4, T5 and header/robots checks). Read-only HTTP; prints a summary and writes JSON evidence.
//
//   node scripts/route-matrix.mjs <baseUrl> <full|secondary> [evidence.json]
//
// `full`      = normal build (proxy active): exact 404/405 contract, headers, hosts, links.
// `secondary` = a test-only copy built WITHOUT proxy.ts (never committed): proves every excluded
//               route still fails closed through its segment layout / handler guard alone.
import { writeFileSync } from 'node:fs'
import http from 'node:http'
import { INSTITUTIONAL_URLS } from '../lib/release/scope.ts'
import { EXCLUDED_ROUTE_LIST } from '../lib/release/routeInventory.ts'
import { SECURITY_HEADERS } from '../lib/release/securityHeaders.ts'
import { SCOPE_I_CLICKABLE_PRODUCT_URLS } from '../lib/release/productDestinations.ts'

const [base, mode = 'full', out] = process.argv.slice(2)
if (!base) { console.error('usage: route-matrix.mjs <baseUrl> <full|secondary> [out.json]'); process.exit(2) }
const concrete = (p) => p.replace(/\[[^\]]+\]/g, 'sample-1')
const results = []
let failures = 0
const check = (id, name, ok, detail = '') => {
  results.push({ id, name, ok, detail })
  if (!ok) { failures++; console.log(`FAIL ${id} ${name} ${detail}`) }
}
// node:http rather than fetch: fetch (undici) silently drops a custom Host header, which would make
// the host-resolution matrix meaningless.
function req(path, { method = 'GET', host, body } = {}) {
  const u = new URL(base)
  return new Promise((resolve, reject) => {
    const headers = { 'user-agent': 'avk-prod-03a-matrix', host: host ?? u.host }
    if (body !== undefined) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(body) }
    const r = http.request({ hostname: u.hostname, port: u.port, path, method, headers }, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const h = new Headers()
        for (const [k, v] of Object.entries(res.headers)) h.set(k, Array.isArray(v) ? v.join(', ') : String(v))
        resolve({ status: res.statusCode, headers: h, text: Buffer.concat(chunks).toString('utf8') })
      })
    })
    r.on('error', reject)
    if (body !== undefined) r.write(body)
    r.end()
  })
}
const EXCLUDED_PREFIXES = ['/start', '/enter', '/journey', '/account', '/auth', '/admin', '/roadmap', '/what-is-an-echo', '/my/', '/today', '/community', '/discover', '/stories', '/watch-first', '/echo', '/practice', '/witness', '/guide', '/continue', '/dev', '/integration', '/api']
const hrefs = (html) => [...html.replace(/<script[\s\S]*?<\/script>/g, '').matchAll(/<a\b[^>]*\bhref="([^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'))
const isExcludedHref = (h) => h.startsWith('/') && EXCLUDED_PREFIXES.some((p) => h === p || h.startsWith(p.endsWith('/') ? p : p + '/') || h.startsWith(p + '?') || h.startsWith(p + '#'))

if (mode === 'full') {
  const externalHrefs = new Set()
  // T3: all 25 institutional URLs
  for (const p of INSTITUTIONAL_URLS) {
    const r = await req(p)
    check('T3', `GET ${p} 200`, r.status === 200, `status ${r.status}`)
    check('T3', `GET ${p} institutional title`, /<title>[^<]*(AvatarK|Canon|Founder|Living Worlds|Foundation|Ecosystem)[^<]*<\/title>/.test(r.text) && !/<title>Echo/.test(r.text))
    check('T3', `GET ${p} no Set-Cookie`, r.headers.get('set-cookie') === null)
    for (const h of SECURITY_HEADERS) check('T3', `GET ${p} header ${h.key}`, r.headers.get(h.key) === h.value)
    check('T3', `GET ${p} no CSP enforcement header`, r.headers.get('content-security-policy') === null)
    const head = await req(p, { method: 'HEAD' })
    check('T3', `HEAD ${p} 200`, head.status === 200, `status ${head.status}`)
    // T5: link audit
    const links = hrefs(r.text)
    const bad = links.filter(isExcludedHref)
    check('T5', `${p} no links to excluded routes`, bad.length === 0, JSON.stringify(bad))
    for (const h of links) if (/^https?:/.test(h)) externalHrefs.add(h)
    // X-1: every rendered external href is an audited VERIFIED_PUBLIC product URL (exact match)
    const approved = new Set(SCOPE_I_CLICKABLE_PRODUCT_URLS.values())
    const unapproved = links.filter((h) => /^https?:/.test(h) && !approved.has(h))
    check('X-1', `${p} external hrefs only to VERIFIED_PUBLIC destinations`, unapproved.length === 0, JSON.stringify(unapproved))
    // CD-2: no practice route anywhere in the document (anchors, RSC payload, prefetch hints)
    check('CD-2', `${p} no /practice/ reference in HTML or RSC payload`, !/\/practice\//.test(r.text), (r.text.match(/.{0,60}\/practice\/.{0,60}/) || [''])[0])
    check('X-1', `${p} no studiok.dt4m.ai href`, !links.some((h) => h.includes('studiok.dt4m.ai')))
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
      const x = await req(p, { method: m })
      check('T1c', `${m} ${p} 405`, x.status === 405 && x.headers.get('allow') === 'GET, HEAD', `status ${x.status}`)
    }
  }
  results.push({ id: 'T5', name: 'external hrefs rendered on institutional pages (X-1 ruled in 03B)', ok: true, detail: [...externalHrefs].sort() })
  // T3b: all 59 excluded patterns, GET/HEAD/POST -> 404 from the proxy denial
  for (const r0 of EXCLUDED_ROUTE_LIST) {
    for (const m of ['GET', 'HEAD', 'POST']) {
      const r = await req(concrete(r0), { method: m, body: m === 'POST' ? '{}' : undefined })
      const denial = r.headers.get('x-robots-tag') === 'noindex, nofollow' && (m === 'HEAD' || r.text === 'Not Found')
      check('T3b', `${m} ${r0} 404 (proxy denial)`, r.status === 404 && denial && r.headers.get('set-cookie') === null, `status ${r.status}`)
    }
  }
  // unknown paths and slugs
  for (const p of ['/x', '/canon/sacred-geometry/unknown', '/canon/sacred-geometry/Orientation', '/ECOSYSTEM', '/%61dmin', '/admin.png', '/_next/image?url=%2Fx&w=64&q=75', '/file.svg', '/sitemap.xml', '/_not-found', '/api/identity/verify']) {
    const r = await req(p)
    check('T1b', `GET ${p} 404`, r.status === 404, `status ${r.status}`)
  }
  check('T1b', 'POST /api/identity/verify 404', (await req('/api/identity/verify', { method: 'POST', body: '{"accessToken":"x"}' })).status === 404)
  check('T1c', 'Server Action POST / 405', (await req('/', { method: 'POST', body: '[]' })).status === 405)
  // T4: host matrix
  for (const host of ['next.avatark.ai', 'avatark.ai', 'www.avatark.ai', 'localhost', 'avatark-platform-web-git-release-avatark-institutional-01-avatark.vercel.app', 'echo.avatark.ai']) {
    const r = await req('/', { host })
    check('T4', `Host ${host} / institutional homepage`, r.status === 200 && /<title>AvatarK — The Architecture of Becoming<\/title>/.test(r.text), `status ${r.status}`)
    const noindex = r.headers.get('x-robots-tag')
    if (host === 'next.avatark.ai') check('I-1', 'next.avatark.ai X-Robots-Tag noindex', noindex === 'noindex', String(noindex))
    else check('I-1', `${host} not noindexed by the interim-host rule`, noindex === null, String(noindex))
  }
  // robots.txt
  const robots = await req('/robots.txt')
  check('C6', 'robots.txt allows crawling, no sitemap', robots.status === 200 && /User-Agent: \*/i.test(robots.text) && /Allow: \//.test(robots.text) && !/Sitemap:/i.test(robots.text) && !/Disallow: \//.test(robots.text), robots.text.replace(/\n/g, ' | '))
  const fav = await req('/favicon.ico')
  check('T3', 'favicon.ico 200', fav.status === 200)
} else if (mode === 'secondary') {
  // T3c: proxy removed -- every excluded route must still fail closed via L2 guards.
  for (const r0 of EXCLUDED_ROUTE_LIST) {
    const isApi = r0.startsWith('/api/') || r0 === '/auth/callback'
    for (const m of isApi ? ['GET', 'POST', 'PATCH'] : ['GET']) {
      const r = await req(concrete(r0), { method: m, body: m === 'GET' ? undefined : '{}' })
      const okStatus = isApi ? r.status === 404 || r.status === 405 : r.status === 404
      check('T3c', `${m} ${r0} fails closed without proxy`, okStatus && r.headers.get('set-cookie') === null && !/location/i.test([...r.headers.keys()].join(',')), `status ${r.status}`)
    }
  }
  for (const p of ['/', '/ecosystem']) check('T3c', `GET ${p} still 200 without proxy`, (await req(p)).status === 200)
}
const summary = { mode, base, checks: results.length, failures, at: new Date().toISOString() }
console.log(JSON.stringify(summary))
if (out) writeFileSync(out, JSON.stringify({ summary, results }, null, 1))
process.exit(failures ? 1 : 0)
