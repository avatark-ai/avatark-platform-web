'use client'

import { useEffect, useRef, useState } from 'react'
import type { CanonContent } from '@/lib/content/foundation'
import { SectionContainer } from '@/components/foundation/Container'
import { RevealOnView } from '@avatark/motion'
import { FourAxesGeometry, FOUR_AXES_ENTRY_SETTLE_MS } from '@/components/foundation/geometry/FourAxesGeometry'

// Desktop: tabs, one axis visible at a time, above a shared geometry
// diagram that's always visible and reacts to the active tab. Mobile:
// accordion, same data and same geometry, no separate content model.
//
// Motion: the geometry plays its staged entrance once (Awareness -> line
// -> Wisdom -> line -> Responsibility -> line -> Creation), then the
// explanation for the default axis fades in -- once, on first reveal
// only. After that, switching axes moves the tab's active indicator,
// emphasizes the relevant line/node in the geometry with one localized
// pulse, and crossfades the explanation text -- it never replays the
// full entrance.
//
// This renders only the geometry + axes tablist/accordion, not a page
// masthead -- its one caller (app/canon/page.tsx) owns the page's own
// title/intro, so this doesn't repeat "The Canon" and its intro
// paragraph a second time on the same page.
export function Canon({ content }: { content: CanonContent }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const activeIndex = openIndex ?? 0

  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null)

  useEffect(() => {
    function measure() {
      const el = tabRefs.current[activeIndex]
      if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [activeIndex])

  return (
    <section id="four-axes">
      <SectionContainer>
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--gold)' }}>
          {content.subtitle}
        </p>

        <RevealOnView className="mx-auto mt-6 max-w-lg sm:max-w-xl">
          <FourAxesGeometry axes={content.axes} activeIndex={activeIndex} />
        </RevealOnView>

        {/* Desktop: tabs */}
        <div className="mt-8 hidden sm:block">
          <div className="relative border-b" style={{ borderColor: 'var(--paper-line)' }}>
            <div role="tablist" aria-label="The Four Axes" className="flex">
              {content.axes.map((axis, index) => {
                const selected = index === activeIndex
                return (
                  <button
                    key={axis.id}
                    ref={(el) => {
                      tabRefs.current[index] = el
                    }}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`canon-panel-${axis.id}`}
                    id={`canon-tab-${axis.id}`}
                    onClick={() => setOpenIndex(index)}
                    className="flex-1 rounded-t-sm px-4 py-3 text-sm font-semibold transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{ color: selected ? 'var(--ink)' : 'var(--ink-dim)', outlineColor: 'var(--gold)' }}
                  >
                    {axis.label}
                    <span className="ml-2 text-xs font-normal" style={{ color: 'var(--ink-dim)' }}>
                      {axis.figure}
                    </span>
                  </button>
                )
              })}
            </div>
            {indicator && (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute bottom-[-1px] left-0 block h-[2px] w-px"
                style={{
                  background: 'var(--gold)',
                  transform: `translateX(${indicator.left}px) scaleX(${indicator.width})`,
                  transformOrigin: 'left',
                  transition: 'transform 250ms var(--motion-ease-settle)',
                }}
              />
            )}
          </div>
          <RevealOnView className="motion-emerge" style={{ '--motion-delay': `${FOUR_AXES_ENTRY_SETTLE_MS}ms` } as React.CSSProperties}>
            {content.axes.map((axis, index) => (
              <div
                key={axis.id}
                role="tabpanel"
                id={`canon-panel-${axis.id}`}
                aria-labelledby={`canon-tab-${axis.id}`}
                hidden={index !== activeIndex}
                className="motion-emerge-instant px-1 py-6 text-base leading-7"
                style={{ color: 'var(--ink-dim)' }}
              >
                {axis.body}
              </div>
            ))}
          </RevealOnView>
        </div>

        {/* Mobile: accordion */}
        <div className="mt-6 flex flex-col gap-2 sm:hidden">
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
                  <div
                    id={`canon-accordion-${axis.id}`}
                    className="motion-emerge-instant px-4 pb-4 text-sm leading-6"
                    style={{ color: 'var(--ink-dim)' }}
                  >
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
