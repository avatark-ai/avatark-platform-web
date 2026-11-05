import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// AVK-PROD-03A Commit B (item 7): FinalCta ("Enter Echo →") and EchoIntro ("Begin with Echo") are
// preserved unchanged but must stay unrendered -- no source file may import them.
const ROOTS = ['app', 'components', 'lib', 'packages']
const files = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n)
    if (n === 'node_modules' || n.startsWith('.')) return []
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mjs)$/.test(n) ? [p] : []
  })

test('FinalCta and EchoIntro exist but are imported nowhere', () => {
  const all = ROOTS.flatMap((r) => files(join(process.cwd(), r)))
  for (const name of ['FinalCta', 'EchoIntro']) {
    assert.ok(all.some((f) => f.endsWith(`components/foundation/sections/${name}.tsx`)), `${name} preserved`)
    const importers = all.filter((f) => !f.endsWith(`${name}.tsx`) && new RegExp(`from ['"][^'"]*/${name}['"]|\\b${name}\\b\\s*[,}].*from`).test(readFileSync(f, 'utf8')))
    assert.deepEqual(importers, [], `${name} must stay unimported`)
  }
})
