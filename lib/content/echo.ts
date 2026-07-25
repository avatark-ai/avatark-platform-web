// Typed accessors over content/echo/{echoes,practices,stories,collections}/
// *.md -- the generalized Echo content model. Same convention as
// lib/content/foundation.ts (frontmatter + "## Heading" sections, parsed by
// the existing lib/content/markdown.ts reader, no remark/MDX/CMS dependency
// added), extended with directory listing since this is a *collection* of
// records rather than one document per concept.
//
// Adding a new Echo, Practice, Story or Collection -- including future ones
// like BITS Pilani, Leadership, Health, Krishna, Rama, Prometheus, or a
// community-created Echo -- means adding a new file here, never a code
// change. See docs/ECHO_CONTENT_MODEL.md.
import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { parseFoundationContent, type ParsedContent } from './markdown.ts'

export type EchoCategory = 'archetype' | 'organization' | 'theme' | 'product' | 'community'
export type ContentStatus = 'seed' | 'active' | 'community-pending'

function readEchoContentDir(kind: string): ParsedContent[] {
  const dirPath = path.join(process.cwd(), 'content', 'echo', kind)
  let files: string[]
  try {
    files = readdirSync(dirPath).filter((file) => file.endsWith('.md'))
  } catch {
    // The directory not existing yet (e.g. no stories authored so far) is
    // a real, honest "nothing here" state, not an error.
    return []
  }
  return files
    .map((file) => path.join(dirPath, file))
    .map((filePath) => parseFoundationContent(readFileSync(filePath, 'utf-8')))
}

function splitList(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function sectionParagraph(content: ParsedContent, heading: string): string {
  return content.sections.find((section) => section.heading === heading)?.paragraphs[0] ?? ''
}

// Demo/preview content (e.g. an illustrative Story or Community entry with
// no live backing product data) is marked with `demo: true` in frontmatter
// and surfaced via `isDemo` so it is never rendered indistinguishably from
// real content -- callers are expected to badge it.
function isDemoContent(content: ParsedContent): boolean {
  return content.meta.demo === 'true'
}

export interface EchoRecord {
  slug: string
  name: string
  category: EchoCategory
  role: string
  themes: string[]
  status: ContentStatus
  mission: string
  giftMessage: string
  isDemo: boolean
}

export function listEchoes(): EchoRecord[] {
  return readEchoContentDir('echoes').map((content) => ({
    slug: content.meta.slug ?? '',
    name: content.meta.name ?? content.meta.slug ?? '',
    category: (content.meta.category as EchoCategory) ?? 'archetype',
    role: content.meta.role ?? '',
    themes: splitList(content.meta.themes),
    status: (content.meta.status as ContentStatus) ?? 'seed',
    mission: sectionParagraph(content, 'Mission'),
    giftMessage: sectionParagraph(content, 'GiftMessage'),
    isDemo: isDemoContent(content),
  }))
}

export function getEchoBySlug(slug: string): EchoRecord | undefined {
  return listEchoes().find((echo) => echo.slug === slug)
}

export interface PracticeRecord {
  slug: string
  sourceEcho: string
  title: string
  witnessLabel: string
  duration: string
  modality: string
  themes: string[]
  status: ContentStatus
  narrative: string
  purpose: string
  whyItMattered: string
  whatYouMayNotice: string
  isDemo: boolean
}

export function listPractices(): PracticeRecord[] {
  return readEchoContentDir('practices').map((content) => ({
    slug: content.meta.slug ?? '',
    sourceEcho: content.meta.sourceEcho ?? '',
    title: content.meta.title ?? content.meta.slug ?? '',
    witnessLabel: content.meta.witnessLabel ?? content.meta.title ?? content.meta.slug ?? '',
    duration: content.meta.duration ?? '',
    modality: content.meta.modality ?? '',
    themes: splitList(content.meta.themes),
    status: (content.meta.status as ContentStatus) ?? 'seed',
    narrative: sectionParagraph(content, 'Narrative'),
    purpose: sectionParagraph(content, 'Purpose'),
    whyItMattered: sectionParagraph(content, 'WhyItMattered'),
    whatYouMayNotice: sectionParagraph(content, 'WhatYouMayNotice'),
    isDemo: isDemoContent(content),
  }))
}

export function getPracticeBySlug(slug: string): PracticeRecord | undefined {
  return listPractices().find((practice) => practice.slug === slug)
}

export function listPracticesByEcho(echoSlug: string): PracticeRecord[] {
  return listPractices().filter((practice) => practice.sourceEcho === echoSlug)
}

// A real, declared-theme match (not a fabricated recommendation): picks
// the first practice whose themes include the given intention id, falling
// back to the first practice that exists at all. With one seed practice
// today this always resolves to it; the match logic is what lets a second
// practice start narrowing results without any code change.
export function pickPracticeForIntention(intentionId: string | null): PracticeRecord | undefined {
  const practices = listPractices()
  if (!practices.length) return undefined
  if (intentionId) {
    const match = practices.find((practice) => practice.themes.includes(intentionId))
    if (match) return match
  }
  return practices[0]
}

export interface StoryRecord {
  slug: string
  sourceEcho: string | null
  title: string
  duration: string
  themes: string[]
  status: ContentStatus
  description: string
  /** A real, playable source. Null means "no media yet" -- render a truthful preview state, never a fake player. */
  mediaUrl: string | null
  isDemo: boolean
}

export function listStories(): StoryRecord[] {
  return readEchoContentDir('stories').map((content) => ({
    slug: content.meta.slug ?? '',
    sourceEcho: content.meta.sourceEcho || null,
    title: content.meta.title ?? content.meta.slug ?? '',
    duration: content.meta.duration ?? '',
    themes: splitList(content.meta.themes),
    status: (content.meta.status as ContentStatus) ?? 'seed',
    description: sectionParagraph(content, 'Description'),
    mediaUrl: content.meta.mediaUrl || null,
    isDemo: isDemoContent(content),
  }))
}

export function getStoryBySlug(slug: string): StoryRecord | undefined {
  return listStories().find((story) => story.slug === slug)
}

export function listStoriesByEcho(echoSlug: string): StoryRecord[] {
  return listStories().filter((story) => story.sourceEcho === echoSlug)
}

export function listCollectionsForEcho(echoSlug: string): CollectionRecord[] {
  return listCollections().filter((collection) => collection.echoSlugs.includes(echoSlug))
}

export interface CollectionRecord {
  slug: string
  title: string
  themes: string[]
  status: ContentStatus
  description: string
  echoSlugs: string[]
  practiceSlugs: string[]
  storySlugs: string[]
  isDemo: boolean
}

export function listCollections(): CollectionRecord[] {
  return readEchoContentDir('collections').map((content) => ({
    slug: content.meta.slug ?? '',
    title: content.meta.title ?? content.meta.slug ?? '',
    themes: splitList(content.meta.themes),
    status: (content.meta.status as ContentStatus) ?? 'seed',
    description: sectionParagraph(content, 'Description'),
    echoSlugs: splitList(content.meta.echoes),
    practiceSlugs: splitList(content.meta.practices),
    storySlugs: splitList(content.meta.stories),
    isDemo: isDemoContent(content),
  }))
}

export function getCollectionBySlug(slug: string): CollectionRecord | undefined {
  return listCollections().find((collection) => collection.slug === slug)
}
