// Structured, faithfully-ported copy for the Operators, Dynamics, and
// Alignment institutional reader pages -- sourced from the published
// canon.avatark.ai/canon/operators, /canon/dynamics, and
// /canon/alignment/arena pages. Wording is preserved; only presentation
// (cards, lists) is locally authored. Do not rewrite this into marketing
// language -- see AGENTS.md-adjacent Canon guidance in the /canon route
// files for why.

export interface CanonPair {
  label: string
  body: string
}

// ---- Operators -------------------------------------------------------

export interface OperatorEntry {
  id: string
  title: string
  subtitle: string
  body: string
  constraintNote: string
}

export const OPERATORS_CONTENT = {
  eyebrow: 'Canon / Operators',
  title: 'Operators',
  intro: [
    'Irreducible modes governing how adaptive systems stabilize perception, navigate change, preserve coherence, and generate novelty.',
    'Operators describe structural pressures rather than symbolic or narrative constructs.',
  ],
  operators: [
    {
      id: 'ground',
      title: 'Ground',
      subtitle: 'Stillness Operator',
      body: 'Ground governs perceptual stabilization and reference frame formation. It minimizes noise, anchors observation, and enables coherent interpretation.',
      constraintNote: 'Absence of Ground produces instability, reactive drift, and loss of perceptual coherence.',
    },
    {
      id: 'dynamics',
      title: 'Dynamics',
      subtitle: 'Play & Adaptation Operator',
      body: 'Dynamics governs variation, exploration, relational movement, and adaptive response. It enables systems to navigate uncertainty and expand behavioral flexibility.',
      constraintNote: 'Suppression of Dynamics produces rigidity and reduced adaptive capacity.',
    },
    {
      id: 'structure',
      title: 'Structure',
      subtitle: 'Coherence Operator',
      body: 'Structure governs constraint stabilization, continuity preservation, and coherence enforcement. It regulates variability into stable, intelligible regimes.',
      constraintNote: 'Weak Structure results in fragmentation, drift, and systemic incoherence.',
    },
    {
      id: 'emergence',
      title: 'Emergence',
      subtitle: 'Capability Operator',
      body: 'Emergence governs novelty injection, constraint relaxation, and phase transitions. It introduces new degrees of freedom when prior models become insufficient.',
      constraintNote: 'Unregulated Emergence produces instability; suppressed Emergence produces stagnation pressure.',
    },
  ] satisfies OperatorEntry[],
  canonicalConstraint: {
    heading: 'Canonical Constraint',
    formula: 'Ground + Dynamics + Structure + Emergence = 1',
    note: 'Operators describe normalized influence distributions. System evolution corresponds to redistribution of dominance relations rather than categorical transitions.',
  },
}

// ---- Dynamics ----------------------------------------------------------

export const DYNAMICS_CONTENT = {
  eyebrow: 'Canon / Dynamics',
  title: 'Dynamics',
  intro: [
    'Adaptive systems evolve through redistribution of operator dominance rather than fixed categorical states.',
    'Stability, disruption, adaptation, and transformation are interpreted as changes in operator relations over time.',
  ],
  dominanceDistributions: {
    heading: 'Dominance Distributions',
    lead: 'At any moment, a system can be represented as a normalized distribution:',
    formula: 'State(t) = [Ground, Dynamics, Structure, Emergence]',
    note: 'Operators describe relative influence, not discrete modes. No operator is absent; dominance varies continuously.',
  },
  canonicalConstraint: {
    heading: 'Canonical Constraint',
    formula: 'Ground + Dynamics + Structure + Emergence = 1',
    note: 'Time corresponds to redistribution of this conserved total across operators.',
  },
  stabilityAxes: {
    heading: 'Stability & Transformation Axes',
    lead: 'Canonical behavior is regulated by two irreducible tensions:',
    pairs: [
      { label: 'Structure ↔ Emergence', body: 'constraint preservation vs novelty and capability shifts.' },
      { label: 'Ground ↔ Dynamics', body: 'perceptual stabilization vs variation and exploration.' },
    ] satisfies CanonPair[],
    closing: 'Viability depends on regulating these tensions rather than eliminating them.',
  },
  regimes: {
    heading: 'Canonical Regimes',
    lead: 'Dominance patterns produce characteristic regimes:',
    items: [
      { label: 'Ground-dominant', body: 'calibration, recovery, reference stabilization, noise reduction.' },
      { label: 'Dynamics-dominant', body: 'exploration, learning, adaptive navigation under uncertainty.' },
      { label: 'Structure-dominant', body: 'consolidation, governance, coherence preservation, scalable stability.' },
      { label: 'Emergence-dominant', body: 'phase transitions, discontinuity events, new capability regimes.' },
    ] satisfies CanonPair[],
  },
  transitions: {
    heading: 'Transition Patterns',
    lead: 'Adaptive systems exhibit recurrent redistribution sequences. A common innovation cycle is:',
    innovationCycle: ['Stable Structure', 'Emergence Activation', 'Dynamics Exploration', 'Structural Reorganization', 'New Stability'],
    stabilizationLead: 'A common stabilization cycle is:',
    stabilizationCycle: ['High Volatility', 'Structure Reinforcement', 'Noise Reduction (Ground)', 'Coherent Regime Recovery'],
  },
  imbalance: {
    heading: 'Imbalance Signatures',
    lead: 'Persistent dominance distortions generate predictable outcomes:',
    items: [
      { label: 'Excess Emergence', body: 'instability, unpredictability, coherence loss.' },
      { label: 'Excess Structure', body: 'rigidity, stagnation pressure, brittleness under novelty.' },
      { label: 'Excess Dynamics', body: 'drift, incoherence, lack of convergence.' },
      { label: 'Weak Ground', body: 'noise amplification, reactive oscillation, loss of reference.' },
    ] satisfies CanonPair[],
    closing: 'Healthy systems regulate bounded oscillation rather than suppressing operators.',
  },
  closing: {
    heading: 'Canonical Meaning of Change',
    body: 'Within the AvatarK Canon, change is the redistribution of operator dominance over time, stability is regulated constraint, and transformation is structured emergence.',
  },
}

// ---- Alignment (Arena) --------------------------------------------------

export const ALIGNMENT_CONTENT = {
  eyebrow: 'Canon / Alignment / Arena',
  title: 'Arena',
  intro: [
    'Arena is the applied alignment field: where intent, incentives, competition, cooperation, and governance are tested under real-world pressure.',
    'This page defines Arena as a canonical "stress interface" that makes alignment measurable.',
  ],
  canonicalRole: {
    heading: 'Canonical Role',
    body: 'Arena operationalizes alignment. It is the environment where systems encounter constraints, adversaries, limited resources, time pressure, and feedback loops that reveal whether coherence is preserved.',
  },
  measures: {
    heading: 'What Arena Measures',
    items: [
      { label: 'Reference Integrity (Ground)', body: 'are observations stable and trusted under noise and incentive pressure?' },
      { label: 'Constraint Enforcement (Structure)', body: 'do rules, policies, and identity boundaries hold under stress?' },
      { label: 'Adaptive Response (Dynamics)', body: 'can the system adapt without drifting into incoherence?' },
      { label: 'Safe Capability Shifts (Emergence)', body: 'can novelty be introduced without destabilizing the whole regime?' },
    ] satisfies CanonPair[],
  },
  loop: {
    heading: 'Arena Loop',
    steps: ['Observe', 'Decide', 'Act', 'Measure', 'Adjust'],
    operatorLabels: ['Ground', 'Structure', 'Dynamics', 'Ground', 'Structure/Dynamics'],
    note: 'Arena is not "combat" by default. It is a controlled loop that makes alignment legible through repeated trials.',
  },
  misalignmentSignals: {
    heading: 'Misalignment Signals',
    items: [
      { label: 'Policy drift', body: 'rules degrade or get bypassed under incentives.' },
      { label: 'Reward hacking', body: 'optimization targets diverge from intent.' },
      { label: 'Fragility', body: 'small perturbations trigger collapse.' },
      { label: 'Runaway novelty', body: 'capability jumps without reintegration.' },
    ] satisfies CanonPair[],
  },
  summary: {
    heading: 'Canonical Summary',
    body: 'Arena is where alignment is proven. It turns abstract coherence into measurable behavior under pressure, enabling disciplined improvement rather than belief-based claims.',
  },
}
