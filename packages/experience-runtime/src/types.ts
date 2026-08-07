// Data-driven domain types for the Journey Runtime. No product (StreamK, GameK, ArenaK, ...)
// is named or special-cased anywhere in this file -- a "journey" is whatever a
// JourneyDefinition's data describes.

export type JourneyNodeKind = "episode" | "livingWorld" | "practice" | "challenge";

export interface JourneyNode {
  id: string;
  title: string;
  /** Ids of any nodes (episode, livingWorld, practice, or challenge) that must be
   * completed/visited before this node becomes reachable. */
  prerequisites: string[];
}

export interface EpisodeDefinition extends JourneyNode {
  /** Ids of reflections surfaced when this episode is completed. */
  reflectionIds?: string[];
}

export type LivingWorldDefinition = JourneyNode;

/** A single definition covers both Practices and Challenges (mission diagram's two
 * sibling leaf concepts) -- `kind` is the only data-driven distinction, so the
 * runtime never needs a separate set of methods for challenges. */
export interface PracticeDefinition extends JourneyNode {
  kind: "practice" | "challenge";
  /** Practices/challenges outside this list don't count toward completion percentage. */
  required?: boolean;
}

export interface ReflectionDefinition {
  id: string;
  episodeId: string;
  prompt: string;
}

export interface MilestoneCriteria {
  requiredEpisodeIds?: string[];
  requiredWorldIds?: string[];
  requiredPracticeIds?: string[];
  requiredReflectionIds?: string[];
}

export interface MilestoneDefinition {
  id: string;
  title: string;
  criteria: MilestoneCriteria;
}

/** Completion uses the same shape as a milestone's criteria -- "finishing the
 * journey" is just the criteria for its largest milestone. */
export type CompletionCriteria = MilestoneCriteria;

export interface JourneyDefinition {
  id: string;
  title: string;
  episodes: EpisodeDefinition[];
  livingWorlds: LivingWorldDefinition[];
  practices: PracticeDefinition[];
  reflections: ReflectionDefinition[];
  milestones: MilestoneDefinition[];
  completionCriteria: CompletionCriteria;
}

export type JourneyStatus =
  | "not_started"
  | "active"
  | "paused"
  | "completed"
  | "abandoned";

export interface JourneyState {
  journeyId: string;
  subjectId: string;
  status: JourneyStatus;
  currentEpisodeId: string | null;
  currentWorldId: string | null;
  activePracticeId: string | null;
  completedEpisodeIds: string[];
  visitedWorldIds: string[];
  completedPracticeIds: string[];
  completedReflectionIds: string[];
  completedMilestoneIds: string[];
  startedAt: number;
  updatedAt: number;
}

export type JourneyTransitionType =
  | "started"
  | "resumed"
  | "episode_completed"
  | "world_entered"
  | "practice_started"
  | "practice_finished"
  | "advanced"
  | "paused"
  | "abandoned"
  | "milestone_reached"
  | "completed";

export interface JourneyTransition {
  type: JourneyTransitionType;
  at: number;
  nodeId?: string;
  detail?: string;
}

export interface JourneyHistory {
  journeyId: string;
  subjectId: string;
  transitions: JourneyTransition[];
}

export interface JourneyProgress {
  journeyId: string;
  status: JourneyStatus;
  percentComplete: number;
  completedEpisodeIds: string[];
  visitedWorldIds: string[];
  completedPracticeIds: string[];
  completedChallengeIds: string[];
  completedReflectionIds: string[];
  pendingReflectionIds: string[];
  completedMilestoneIds: string[];
  nextEpisode: EpisodeDefinition | null;
  nextLivingWorld: LivingWorldDefinition | null;
  nextPractice: PracticeDefinition | null;
  isComplete: boolean;
}

export class JourneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "JourneyError";
  }
}
