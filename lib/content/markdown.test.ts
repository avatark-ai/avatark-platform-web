import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { parseFoundationContent, slugifyHeading } from './markdown.ts'
import { parseFoundationContent as parseLegacy } from './fixtures/markdownLegacy.cc54874.ts'

// AVK-FOUNDER-LIVING-WORLDS-02: "### " sub-heading support in the content parser.

test('a "### " block becomes a sub-heading, not a paragraph', () => {
  const parsed = parseFoundationContent('Intro.\n\n## Future\n\nOne.\n\n### Why Living Worlds?\n\nTwo.\n\n> Three.\n')
  const [s] = parsed.sections
  assert.deepEqual(s.paragraphs, ['One.', 'Two.', 'Three.'])
  assert.deepEqual(s.subheadings, [{ beforeParagraph: 1, text: 'Why Living Worlds?', id: 'why-living-worlds' }])
  assert.deepEqual(s.pullQuotes, [2])
})

test('pull-quote indexes stay correct when a sub-heading precedes them', () => {
  const [s] = parseFoundationContent('Intro.\n\n## A\n\n### Sub\n\n> Quote.\n\nAfter.\n').sections
  assert.deepEqual(s.paragraphs, ['Quote.', 'After.'])
  assert.deepEqual(s.pullQuotes, [0])
  assert.equal(s.subheadings?.[0].beforeParagraph, 0)
})

test('a trailing sub-heading points past the last paragraph', () => {
  const [s] = parseFoundationContent('Intro.\n\n## A\n\nOne.\n\n### End\n').sections
  assert.deepEqual(s.subheadings, [{ beforeParagraph: 1, text: 'End', id: 'end' }])
})

test('"###" does not open a new "##" section and "####"/"#x" are untouched', () => {
  const parsed = parseFoundationContent('Intro.\n\n## A\n\n### B\n\nText.\n\n#### C\n\n#no-space\n')
  assert.equal(parsed.sections.length, 1)
  assert.deepEqual(parsed.sections[0].paragraphs, ['Text.', '#### C', '#no-space'])
})

test('slugifyHeading', () => {
  assert.equal(slugifyHeading('Why Living Worlds?'), 'why-living-worlds')
  assert.equal(slugifyHeading('  A — B & C  '), 'a-b-c')
})

function mdFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name)
    return statSync(p).isDirectory() ? mdFiles(p) : name.endsWith('.md') ? [p] : []
  })
}

test('every content/**/*.md except the edited Founder Letter parses exactly as before (Echo included)', () => {
  const files = mdFiles(path.join(process.cwd(), 'content'))
  assert.ok(files.some((f) => f.includes(`${path.sep}echo${path.sep}`)), 'echo content covered')
  let compared = 0
  for (const file of files) {
    const raw = readFileSync(file, 'utf-8')
    const now = parseFoundationContent(raw)
    const legacy = parseLegacy(raw)
    const stripped = {
      ...now,
      sections: now.sections.map((section) => {
        const rest = { ...section }
        delete rest.subheadings
        return rest
      }),
    }
    if (!file.endsWith('founder-letter.md')) {
      assert.deepEqual(stripped, legacy, file)
      assert.ok(now.sections.every((s) => (s.subheadings ?? []).length === 0), file)
      compared += 1
    }
  }
  assert.ok(compared >= 6, String(compared))
})
