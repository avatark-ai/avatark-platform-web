import type { JourneyStepId } from "@avatark/journey"

export interface JourneyRailProps {
  steps: JourneyStepId[]
  currentStepId: JourneyStepId
  completedStepIds?: JourneyStepId[]
  className?: string
}

// Presentational only -- renders whatever step order the host passes
// (typically @avatark/journey's JOURNEY_STEP_ORDER). Does not itself know
// about JOURNEY_TRANSITIONS/canTransition; the host is responsible for
// only ever passing a legal sequence.
export function JourneyRail({ steps, currentStepId, completedStepIds = [], className }: JourneyRailProps) {
  return (
    <ol className={className} data-avatark-component="journey-rail">
      {steps.map((step) => (
        <li
          key={step}
          data-avatark-part="journey-step"
          data-current={step === currentStepId}
          data-completed={completedStepIds.includes(step)}
        >
          {step}
        </li>
      ))}
    </ol>
  )
}
