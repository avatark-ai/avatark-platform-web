// AVK-PROD-03A (C7, T2): pre-build route inventory gate. Derives every route pattern from app/
// source files and fails (exit 1) if any is unclassified, or if a classified route no longer exists.
// Optional argument: a built .next directory, to check the emitted app-path-routes-manifest.json too.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { ALLOW_ROUTES, EXCLUDED_ROUTE_LIST, FRAMEWORK_ROUTES, classifyRoute } from '../lib/release/routeInventory.ts'

const ROUTE_FILE = /^(page\.(tsx|ts|jsx|js|mdx)|route\.(ts|js)|robots\.(ts|js|txt)|sitemap\.(ts|js|xml)|manifest\.(ts|js|json)|favicon\.ico|(icon|apple-icon|opengraph-image|twitter-image)\.[a-z]+)$/

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (ROUTE_FILE.test(name)) out.push(p)
  }
  return out
}

export function routeFromFile(appDir: string, file: string): string {
  const parts = relative(appDir, file).split(sep)
  const name = parts.pop() as string
  const segs = parts.filter((s) => !(s.startsWith('(') && s.endsWith(')')) && !s.startsWith('@'))
  // Metadata files map to their served URL; page/route files map to their directory.
  const METADATA_URL: Record<string, string> = { robots: '/robots.txt', sitemap: '/sitemap.xml', manifest: '/manifest.webmanifest', favicon: '/favicon.ico' }
  const base = name.split('.')[0]
  let leaf = ''
  if (base in METADATA_URL) leaf = METADATA_URL[base]
  else if (/^(icon|apple-icon|opengraph-image|twitter-image)$/.test(base)) leaf = '/' + base
  return ('/' + segs.join('/') + leaf).replace(/\/+/g, '/').replace(/(.)\/$/, '$1')
}

export function checkInventory(routes: string[]): string[] {
  const problems: string[] = []
  const seen = new Set(routes)
  for (const r of routes) if (!classifyRoute(r)) problems.push(`UNCLASSIFIED route: ${r}`)
  const expected = [...ALLOW_ROUTES, ...EXCLUDED_ROUTE_LIST, '/favicon.ico', '/robots.txt']
  for (const r of expected) if (!seen.has(r)) problems.push(`classified route missing from source: ${r}`)
  return problems
}

const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href
if (isMain) {
  const appDir = join(process.cwd(), 'app')
  const routes = [...new Set(walk(appDir).map((f) => routeFromFile(appDir, f)))].sort()
  const problems = checkInventory(routes)
  const nextDir = process.argv[2]
  if (nextDir) {
    const mf = join(nextDir, 'app-path-routes-manifest.json')
    if (!existsSync(mf)) problems.push(`missing ${mf}`)
    else {
      const built = [...new Set(Object.values(JSON.parse(readFileSync(mf, 'utf8')) as Record<string, string>))].sort()
      for (const r of built) if (!classifyRoute(r)) problems.push(`UNCLASSIFIED built route: ${r}`)
      const counts = { ALLOW: 0, EXCLUDE: 0, FRAMEWORK: 0 } as Record<string, number>
      for (const r of built) { const c = classifyRoute(r); if (c) counts[c]++ }
      console.log(`route inventory (built): ${built.length} routes = ${counts.ALLOW} allow + ${counts.EXCLUDE} exclude + ${counts.FRAMEWORK} framework`)
    }
  }
  console.log(`route inventory (source): ${routes.length} route files classified; framework list ${FRAMEWORK_ROUTES.length}`)
  if (problems.length) {
    for (const p of problems) console.error(`AVK-PROD route inventory: ${p}`)
    console.error('AVK-PROD route inventory: FAILED, refusing to build')
    process.exit(1)
  }
  console.log('AVK-PROD route inventory: ok')
}
