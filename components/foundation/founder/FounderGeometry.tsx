import { getCanonContent } from '@/lib/content/foundation'
import { RevealOnView } from '@/components/motion/RevealOnView'
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
    <RevealOnView className="mx-auto my-12 max-w-lg sm:max-w-2xl">
      <FourAxesGeometry axes={axes} />
    </RevealOnView>
  )
}
