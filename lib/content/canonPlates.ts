// Sacred Geometry: Plates I-XII. Titles, subtitles, ordering, and thumbnail
// imagery are ported from the published plate index at
// https://canon.avatark.ai/canon/plates/sacred-geometry/plates -- nothing
// here is invented.
//
// Only Plate I (Orientation) carries full detail copy (axiom/invariant/
// body): it's the only plate with a published detail page on the legacy
// site itself -- canon.avatark.ai/canon/plates/sacred-geometry/plates/
// plate-ii-symmetry through plate-xii-synthesis all currently 404 there
// ("Plate not found"). Detail content for Plates II-XII doesn't exist
// anywhere yet, so `hasDetail: false` renders an honest "forthcoming"
// state inside the institutional shell instead of fabricating canonical
// text or linking out to a page that doesn't exist.

export interface CanonPlate {
  numeral: string
  slug: string
  title: string
  subtitle: string
  imageSrc: string
  hasDetail: boolean
  axiom?: string
  invariant?: string
  body?: string[]
  // Legacy detail URL -- only set where legacy content actually exists.
  legacyHref?: string
}

export const CANON_PLATES: CanonPlate[] = [
  {
    numeral: 'I',
    slug: 'orientation',
    title: 'Orientation',
    subtitle: 'Axis, Facing, and Arrival',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-i-orientation.webp',
    hasDetail: true,
    axiom: 'Before meaning, a system must decide what counts as signal.',
    invariant: 'Every perception implies a boundary: foreground vs background.',
    body: [
      'Orientation defines how a system determines what is foreground, background, signal, and noise. It precedes interpretation.',
      'Without orientation, perception collapses into undifferentiated experience. With orientation, structure becomes observable.',
      'Orientation is the first constraint: it names what counts as data before any meaning is assigned.',
    ],
    legacyHref: 'https://canon.avatark.ai/canon/plates/sacred-geometry/plates/plate-i-orientation',
  },
  {
    numeral: 'II',
    slug: 'symmetry',
    title: 'Symmetry',
    subtitle: 'Balance, Mirror, and Center',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-ii-symmetry.webp',
    hasDetail: false,
  },
  {
    numeral: 'III',
    slug: 'repetition',
    title: 'Repetition',
    subtitle: 'Modules, Rhythm, and Pattern',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-iii-repetition.webp',
    hasDetail: false,
  },
  {
    numeral: 'IV',
    slug: 'verticality',
    title: 'Verticality',
    subtitle: 'Lift, Column, and Spine',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-iv-verticality.webp',
    hasDetail: false,
  },
  {
    numeral: 'V',
    slug: 'threshold',
    title: 'Threshold',
    subtitle: 'Gate, Frame, and Passage',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-v-threshold.webp',
    hasDetail: false,
  },
  {
    numeral: 'VI',
    slug: 'precision',
    title: 'Precision',
    subtitle: 'Measure, Joinery, and Fit',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-vi-precision.webp',
    hasDetail: false,
  },
  {
    numeral: 'VII',
    slug: 'circumambulation',
    title: 'Circumambulation',
    subtitle: 'Ring, Orbit, and Return',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-vii-circumambulation.webp',
    hasDetail: false,
  },
  {
    numeral: 'VIII',
    slug: 'material-logic',
    title: 'Material Logic',
    subtitle: 'Surface, Grain, and Constraint',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-viii-material-logic.webp',
    hasDetail: false,
  },
  {
    numeral: 'IX',
    slug: 'fractals',
    title: 'Fractals',
    subtitle: 'Self-Similarity Across Scales',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-ix-fractals.webp',
    hasDetail: false,
  },
  {
    numeral: 'X',
    slug: 'time',
    title: 'Time',
    subtitle: 'Sequence, Memory, and Layer',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-x-time.webp',
    hasDetail: false,
  },
  {
    numeral: 'XI',
    slug: 'erosion',
    title: 'Erosion',
    subtitle: 'Weathering, Patina, and Record',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-xi-erosion.webp',
    hasDetail: false,
  },
  {
    numeral: 'XII',
    slug: 'synthesis',
    title: 'Synthesis',
    subtitle: 'Unity, Field, and Whole',
    imageSrc: 'https://canon.avatark.ai/canon/plates/plate-xii-synthesis.webp',
    hasDetail: false,
  },
]

export function getCanonPlate(slug: string): CanonPlate | undefined {
  return CANON_PLATES.find((plate) => plate.slug === slug)
}

export function getAdjacentPlates(slug: string): { previous?: CanonPlate; next?: CanonPlate } {
  const index = CANON_PLATES.findIndex((plate) => plate.slug === slug)
  if (index === -1) return {}
  const previous = CANON_PLATES[(index - 1 + CANON_PLATES.length) % CANON_PLATES.length]
  const next = CANON_PLATES[(index + 1) % CANON_PLATES.length]
  return { previous, next }
}
