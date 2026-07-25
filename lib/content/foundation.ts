// Typed accessors over content/foundation/*.md -- pages and section
// components read through these, never the raw parser, so the file layout
// (frontmatter + "## Heading" sections) stays an implementation detail.
import { readFoundationContent } from './markdown.ts'

export interface FounderLetter {
  title: string
  author: string
  role: string
  credentials: string
  paragraphs: string[]
}

export function getFounderLetter(): FounderLetter {
  const content = readFoundationContent('founder-letter.md')
  return {
    title: content.meta.title ?? 'From Possibility to Reality',
    author: content.meta.author ?? '',
    role: content.meta.role ?? '',
    credentials: content.meta.credentials ?? '',
    paragraphs: content.intro,
  }
}

export interface GapCard {
  id: string
  label: string
  body: string
}

export interface ArchitectureContent {
  headline: string
  lines: string[]
  gapStatement: string
  gapCards: GapCard[]
}

export function getArchitectureContent(): ArchitectureContent {
  const content = readFoundationContent('architecture.md')
  const byHeading = new Map(content.sections.map((s) => [s.heading, s]))
  const hero = byHeading.get('Hero')
  const gap = byHeading.get('Gap')

  const cardHeadings = ['Reactive', 'Fragmented', 'NotLongitudinal'] as const
  const cardLabels: Record<(typeof cardHeadings)[number], string> = {
    Reactive: 'Reactive',
    Fragmented: 'Fragmented',
    NotLongitudinal: 'Not Longitudinal',
  }

  return {
    headline: hero?.fields.headline ?? content.meta.title ?? '',
    lines: hero?.paragraphs ?? [],
    gapStatement: gap?.fields.statement ?? '',
    gapCards: cardHeadings.map((heading) => ({
      id: heading.toLowerCase(),
      label: cardLabels[heading],
      body: byHeading.get(heading)?.paragraphs[0] ?? '',
    })),
  }
}

export interface CanonAxis {
  id: string
  label: string
  figure: string
  body: string
}

export interface CanonContent {
  title: string
  subtitle: string
  intro: string[]
  axes: CanonAxis[]
}

export function getCanonContent(): CanonContent {
  const content = readFoundationContent('canon.md')
  return {
    title: content.meta.title ?? 'The Canon',
    subtitle: content.meta.subtitle ?? 'Four Axes',
    intro: content.intro,
    axes: content.sections.map((section) => ({
      id: section.heading.toLowerCase(),
      label: section.heading,
      figure: section.fields.figure ?? '',
      body: section.paragraphs[0] ?? '',
    })),
  }
}

export interface EcosystemGroupContent {
  id: string
  label: string
  productIds: string[]
  body: string
}

export function getEcosystemGroupsContent(): EcosystemGroupContent[] {
  const content = readFoundationContent('ecosystem.md')
  return content.sections.map((section) => ({
    id: section.heading.toLowerCase(),
    label: section.heading,
    productIds: (section.fields.products ?? '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean),
    body: section.paragraphs[0] ?? '',
  }))
}

export interface LivingSpiralContent {
  title: string
  intro: string[]
  stages: string[]
}

export function getLivingSpiralContent(): LivingSpiralContent {
  const content = readFoundationContent('living-spiral.md')
  const stagesSection = content.sections.find((s) => s.heading === 'Stages')
  return {
    title: content.meta.title ?? 'The Living Spiral',
    intro: content.intro,
    stages: (stagesSection?.fields.items ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  }
}

export interface RoadmapContent {
  title: string
  subtitle: string
  intro: string[]
  today: string
  ladder: string
}

export function getRoadmapContent(): RoadmapContent {
  const content = readFoundationContent('roadmap.md')
  const byHeading = new Map(content.sections.map((s) => [s.heading, s]))
  return {
    title: content.meta.title ?? 'Roadmap',
    subtitle: content.meta.subtitle ?? '',
    intro: content.intro,
    today: byHeading.get('Today')?.paragraphs[0] ?? '',
    ladder: byHeading.get('The maturity ladder')?.paragraphs[0] ?? '',
  }
}
