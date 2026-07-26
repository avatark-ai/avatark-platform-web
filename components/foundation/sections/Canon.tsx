'use client'

import { useState } from 'react'
import type { CanonContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'

// Desktop: tabs, one axis visible at a time, geometry (the four-axis
// structure) always visible via the tab row itself. Mobile: accordion,
// same data, no separate content model. No animation -- state toggles
// instantly, per this milestone's explicit scope.
export function Canon({ content }: { content: CanonContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const activeIndex = openIndex ?? 0

  return (
    <section id="canon" className="border-b" style={{ borderColor: 'var(--paper-line)' }}>
      <SectionContainer>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
            {content.subtitle}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{content.title}</h2>
          {content.intro.map((paragraph) => (
            <p key={paragraph} className="mx-auto mt-6 max-w-2xl text-base leading-7" style={{ color: 'var(--ink-dim)' }}>
              {paragraph}
            </p>
          ))}
        </div>

        {/* Desktop: tabs */}
        <div className="mt-8 hidden sm:block">
          <div role="tablist" aria-label="The Four Axes" className="flex border-b" style={{ borderColor: 'var(--paper-line)' }}>
            {content.axes.map((axis, index) => {
              const selected = index === activeIndex
              return (
                <button
                  key={axis.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`canon-panel-${axis.id}`}
                  id={`canon-tab-${axis.id}`}
                  onClick={() => setOpenIndex(index)}
                  className="flex-1 rounded-t-sm px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{
                    color: selected ? 'var(--ink)' : 'var(--ink-dim)',
                    borderBottom: selected ? '2px solid var(--gold)' : '2px solid transparent',
                    outlineColor: 'var(--gold)',
                  }}
                >
                  {axis.label}
                  <span className="ml-2 text-xs font-normal" style={{ color: 'var(--ink-dim)' }}>
                    {axis.figure}
                  </span>
                </button>
              )
            })}
          </div>
          {content.axes.map((axis, index) => (
            <div
              key={axis.id}
              role="tabpanel"
              id={`canon-panel-${axis.id}`}
              aria-labelledby={`canon-tab-${axis.id}`}
              hidden={index !== activeIndex}
              className="px-1 py-6 text-base leading-7"
              style={{ color: 'var(--ink-dim)' }}
            >
              {axis.body}
            </div>
          ))}
        </div>

        {/* Mobile: accordion */}
        <div className="mt-8 flex flex-col gap-2 sm:hidden">
          {content.axes.map((axis, index) => {
            const expanded = openIndex === index
            return (
              <div key={axis.id} className="rounded-lg border" style={{ borderColor: 'var(--paper-line)' }}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`canon-accordion-${axis.id}`}
                  onClick={() => setOpenIndex(expanded ? null : index)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ color: 'var(--ink)', outlineColor: 'var(--gold)' }}
                >
                  <span>
                    {axis.label} <span className="font-normal" style={{ color: 'var(--ink-dim)' }}>{axis.figure}</span>
                  </span>
                  <span aria-hidden="true">{expanded ? '−' : '+'}</span>
                </button>
                {expanded && (
                  <div id={`canon-accordion-${axis.id}`} className="px-4 pb-4 text-sm leading-6" style={{ color: 'var(--ink-dim)' }}>
                    {axis.body}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </SectionContainer>
    </section>
  )
}
