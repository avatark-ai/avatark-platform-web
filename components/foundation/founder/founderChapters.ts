// Single source of truth for the four Founder routes -- their order, rail
// labels, and hrefs. FounderPageNav (the rail), FounderChapterHeader (the
// "Founder Letter · Chapter N of 4" heading), and FounderChapterNav (the
// previous/next links) all read from this instead of each hard-coding the
// same four-item list independently.
export interface FounderChapterMeta {
  id: string
  label: string
  href: string
  order: number
}

export const FOUNDER_CHAPTERS: FounderChapterMeta[] = [
  { id: 'introduction', label: 'Introduction', href: '/founder', order: 1 },
  { id: 'question', label: 'The Question', href: '/founder/question', order: 2 },
  { id: 'synthesis', label: 'The Synthesis', href: '/founder/synthesis', order: 3 },
  { id: 'future', label: 'The Future', href: '/founder/future', order: 4 },
]

export const FOUNDER_CHAPTER_COUNT = FOUNDER_CHAPTERS.length

export function getFounderChapterMeta(id: string): FounderChapterMeta | undefined {
  return FOUNDER_CHAPTERS.find((chapter) => chapter.id === id)
}

export function getAdjacentFounderChapters(id: string): { previous?: FounderChapterMeta; next?: FounderChapterMeta } {
  const index = FOUNDER_CHAPTERS.findIndex((chapter) => chapter.id === id)
  if (index === -1) return {}
  return { previous: FOUNDER_CHAPTERS[index - 1], next: FOUNDER_CHAPTERS[index + 1] }
}
