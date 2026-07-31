import { getCanonContent } from '@/lib/content/foundation'
import { RevealOnView } from '@avatark/motion'
import { FourAxesGeometry } from '@/components/foundation/geometry/FourAxesGeometry'

// The one geometry illustration for the Founder page -- the Synthesis
// route specifically, rendered prominently rather than as a small aside.
// Labels/figures come from getCanonContent() -- the same real Four Axes
// data already used on /canon, not invented for this page. The diagram
// itself is FourAxesGeometry, shared with /canon's interactive version --
// here it's used without `activeIndex`, so it plays its one-time entrance
// (once scrolled into view) and settles, with no active-node emphasis or
// interaction of its own.
export function FounderGeometry() {
  const { axes } = getCanonContent()

  return (
    <RevealOnView className="mx-auto mt-10 max-w-lg sm:max-w-2xl">
      <FourAxesGeometry axes={axes} />
      {/* RC4: a single quiet caption naming the two axes this geometry
          layers together -- the diagram itself is unchanged, this is
          scoped to the Founder page's own wrapper, not FourAxesGeometry
          (shared with /canon), so /canon's presentation is untouched. */}
      <p className="mt-4 text-center text-xs uppercase tracking-wide" style={{ color: 'var(--ink-dim)' }}>
        Human Development · Prometheus, the Fourth Axis
      </p>
    </RevealOnView>
  )
}
