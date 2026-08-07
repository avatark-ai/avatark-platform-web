// JourneyProgress and WorldProgress both already compute percentComplete.
// NarrativeProgress does not -- a real, verified gap, not an assumption.
// Adopting this contract in narrative-runtime would be strictly additive.
export interface Progress {
  percentComplete: number
  completedCount: number
  totalCount: number
}
