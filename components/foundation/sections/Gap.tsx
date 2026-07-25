import { getArchitectureContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'

export function Gap() {
  const { gapStatement, gapCards } = getArchitectureContent()

  return (
    <section id="gap" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <p className="text-center text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
          &ldquo;{gapStatement}&rdquo;
        </p>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {gapCards.map((card) => (
            <div
              key={card.id}
              className="rounded-lg border p-6"
              style={{ borderColor: 'var(--paper-line)', background: 'var(--surface-card)' }}
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
                {card.label}
              </h3>
              <p className="mt-3 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                {card.body}
              </p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  )
}
