import { SectionContainer } from '@/components/foundation/Container'
import { LIVING_WORLDS_COPY as L } from '@/lib/content/livingWorldsCopy'
import { splitLabel } from '@/lib/content/splitLabel'

const STORIES = splitLabel(L['AVK-FLW-LW-15-R']) ?? { label: L['AVK-FLW-LW-15-R'], rest: '' }

// AVK-UNIFICATION-03C §4: the Ramayana collection with its mandatory attribution (AVK-FLW-LW-16C), two
// places, the ecological collection and the further-collections line -- all reused approved copy.
// AvatarK introduces the stories; WorldK keeps the collection-specific chapters and journeys (no
// WorldK collection navigation here). The withheld second epic is never named (WorldK C-1) and no collection
// is created or activated. "Label: body" strings keep their exact text: the part before the first
// ": " is a bold run-in label inside the same <p>.
function RunIn({ text }: { text: string }) {
  const i = text.indexOf(': ')
  if (i < 0) return <>{text}</>
  return (
    <>
      <strong className="font-semibold" style={{ color: 'var(--ink)' }}>
        {text.slice(0, i + 1)}
      </strong>{' '}
      {text.slice(i + 2)}
    </>
  )
}

export function StoriesOfTheForest() {
  return (
    <section id="stories-of-the-forest" aria-labelledby="stories-heading" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="mx-auto max-w-[var(--editorial-width)]">
          {/* D-U03-11 (owner-approved, U-03D): AVK-FLW-LW-15-R rendered as a heading + intro sentence,
              split at its ": " from the single source -- the approved words are unchanged. */}
          <h2 id="stories-heading" className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {STORIES.label}
          </h2>
          <p className="mt-3 text-lg leading-8" style={{ color: 'var(--ink-dim)' }} data-copy-id="AVK-FLW-LW-15-R">
            {STORIES.rest}
          </p>

          <div className="mt-8 rounded-2xl border p-6 sm:p-8" style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}>
            <p className="text-lg leading-8" style={{ color: 'var(--ink-dim)' }} data-copy-id="AVK-FLW-LW-16">
              <RunIn text={L['AVK-FLW-LW-16']} />
            </p>
            <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }} data-copy-id="AVK-FLW-LW-16C">
              {L['AVK-FLW-LW-16C']}
            </p>
            <ul className="mt-6 flex flex-col gap-4 border-t pt-6" style={{ borderColor: 'var(--paper-line)' }}>
              {(['AVK-FLW-LW-13', 'AVK-FLW-LW-14'] as const).map((id) => (
                <li key={id} className="text-base leading-7" style={{ color: 'var(--ink-dim)' }} data-copy-id={id}>
                  <RunIn text={L[id]} />
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-8 text-lg leading-8" style={{ color: 'var(--ink-dim)' }} data-copy-id="AVK-FLW-LW-17">
            <RunIn text={L['AVK-FLW-LW-17']} />
          </p>
          <p className="mt-6 text-base leading-7" style={{ color: 'var(--ink-dim)' }} data-copy-id="AVK-FLW-LW-18-ALT">
            <RunIn text={L['AVK-FLW-LW-18-ALT']} />
          </p>
        </div>
      </SectionContainer>
    </section>
  )
}
