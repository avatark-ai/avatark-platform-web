import { FOUNDER_CHAPTER_COUNT, getFounderChapterMeta } from '@/components/foundation/founder/founderChapters'

// Consistent chapter-opening treatment across all four Founder routes --
// "Founder Letter · Chapter N of 4" plus the chapter's own title, same
// heading weight everywhere. Previously only /founder carried a full-size
// h1 (the letter's own title); the other three chapters opened with just
// a small eyebrow-styled label and no chapter number at all.
export function FounderChapterHeader({ chapterId, title }: { chapterId: string; title: string }) {
  const chapter = getFounderChapterMeta(chapterId)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
        Founder Letter{chapter && ` · Chapter ${chapter.order} of ${FOUNDER_CHAPTER_COUNT}`}
      </p>
      <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">{title}</h1>
    </div>
  )
}
