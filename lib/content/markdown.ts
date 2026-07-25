// Minimal, dependency-free reader for content/foundation/*.md -- deliberately
// not a full markdown renderer (no remark/mdx dependency added). This
// repo's foundation content is editorial prose with a small, fixed shape
// (optional frontmatter, then "## Heading" sections, each an optional
// "field: value" line followed by blank-line-separated paragraphs), so a
// tiny parser covers it without pulling in a rendering pipeline nothing
// else in this repo needs.
import { readFileSync } from 'node:fs'
import path from 'node:path'

export interface ContentSection {
  heading: string
  fields: Record<string, string>
  paragraphs: string[]
  // Indexes into `paragraphs` for any paragraph whose source line started
  // with "> " -- a lightweight pull-quote marker so editorial pages (e.g.
  // Founder) can call out a sentence without a page component hardcoding
  // which paragraph index is "the quote". The marker is stripped from the
  // paragraph text itself; the source sentence is unchanged.
  pullQuotes: number[]
}

export interface ParsedContent {
  meta: Record<string, string>
  intro: string[]
  sections: ContentSection[]
}

function splitParagraphs(block: string): { paragraphs: string[]; pullQuotes: number[] } {
  const raw = block
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)

  const pullQuotes: number[] = []
  const paragraphs = raw.map((p, index) => {
    const isPullQuote = p.startsWith('> ')
    if (isPullQuote) pullQuotes.push(index)
    const text = isPullQuote ? p.slice(2) : p
    return text.replace(/\s+/g, ' ').trim()
  })

  return { paragraphs, pullQuotes }
}

function parseFieldsAndParagraphs(
  block: string,
): { fields: Record<string, string>; paragraphs: string[]; pullQuotes: number[] } {
  const fields: Record<string, string> = {}
  const lines = block.split('\n')
  let index = 0
  while (index < lines.length) {
    const line = lines[index].trim()
    if (line === '') {
      index += 1
      continue
    }
    const match = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/.exec(line)
    if (!match) break
    fields[match[1]] = match[2].trim()
    index += 1
  }
  const rest = lines.slice(index).join('\n')
  const { paragraphs, pullQuotes } = splitParagraphs(rest)
  return { fields, paragraphs, pullQuotes }
}

export function parseFoundationContent(raw: string): ParsedContent {
  let body = raw.replace(/^﻿/, '')
  const meta: Record<string, string> = {}

  const frontmatterMatch = /^---\n([\s\S]*?)\n---\n?/.exec(body)
  if (frontmatterMatch) {
    for (const line of frontmatterMatch[1].split('\n')) {
      const match = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/.exec(line.trim())
      if (match) meta[match[1]] = match[2].trim()
    }
    body = body.slice(frontmatterMatch[0].length)
  }

  const parts = body.split(/\n##\s+/)
  const introBlock = parts[0]
  const { paragraphs: intro } = splitParagraphs(introBlock)

  const sections: ContentSection[] = parts.slice(1).map((part) => {
    const newlineIndex = part.indexOf('\n')
    const heading = (newlineIndex === -1 ? part : part.slice(0, newlineIndex)).trim()
    const rest = newlineIndex === -1 ? '' : part.slice(newlineIndex + 1)
    const { fields, paragraphs, pullQuotes } = parseFieldsAndParagraphs(rest)
    return { heading, fields, paragraphs, pullQuotes }
  })

  return { meta, intro, sections }
}

// content/ lives at the repo root, alongside app/ and lib/ -- read via
// process.cwd() rather than import.meta/relative-to-this-file resolution,
// consistent with how a Next.js server component's working directory is
// always the project root, in both `next dev` and a built server.
export function readFoundationContent(fileName: string): ParsedContent {
  const filePath = path.join(process.cwd(), 'content', 'foundation', fileName)
  const raw = readFileSync(filePath, 'utf-8')
  return parseFoundationContent(raw)
}
