import type {
  CompletionCriteria,
  EpisodeDefinition,
  JourneyDefinition,
  JourneyNode,
  JourneyProgress,
  JourneyState,
  LivingWorldDefinition,
  MilestoneCriteria,
  PracticeDefinition,
} from "./types.ts";

/** Every id a subject has completed or visited, across node kinds -- the set every
 * node's `prerequisites` is checked against, regardless of what kind of node listed it. */
export function completedIds(state: JourneyState): Set<string> {
  return new Set([
    ...state.completedEpisodeIds,
    ...state.visitedWorldIds,
    ...state.completedPracticeIds,
    ...state.completedMilestoneIds,
  ]);
}

export function isUnlocked(node: JourneyNode, state: JourneyState): boolean {
  const done = completedIds(state);
  return node.prerequisites.every((id) => done.has(id));
}

export function criteriaSatisfied(
  criteria: CompletionCriteria | MilestoneCriteria,
  state: JourneyState,
): boolean {
  const episodesOk = (criteria.requiredEpisodeIds ?? []).every((id) =>
    state.completedEpisodeIds.includes(id),
  );
  const worldsOk = (criteria.requiredWorldIds ?? []).every((id) =>
    state.visitedWorldIds.includes(id),
  );
  const practicesOk = (criteria.requiredPracticeIds ?? []).every((id) =>
    state.completedPracticeIds.includes(id),
  );
  const reflectionsOk = (criteria.requiredReflectionIds ?? []).every((id) =>
    state.completedReflectionIds.includes(id),
  );
  return episodesOk && worldsOk && practicesOk && reflectionsOk;
}

function findNextUnlocked<T extends JourneyNode>(
  nodes: T[],
  completedOrVisitedIds: string[],
  state: JourneyState,
): T | null {
  return (
    nodes.find(
      (node) => !completedOrVisitedIds.includes(node.id) && isUnlocked(node, state),
    ) ?? null
  );
}

export function nextEpisode(
  definition: JourneyDefinition,
  state: JourneyState,
): EpisodeDefinition | null {
  return findNextUnlocked(definition.episodes, state.completedEpisodeIds, state);
}

export function nextLivingWorld(
  definition: JourneyDefinition,
  state: JourneyState,
): LivingWorldDefinition | null {
  return findNextUnlocked(definition.livingWorlds, state.visitedWorldIds, state);
}

export function nextPractice(
  definition: JourneyDefinition,
  state: JourneyState,
): PracticeDefinition | null {
  return findNextUnlocked(definition.practices, state.completedPracticeIds, state);
}

/** Milestones satisfied by the current state but not yet recorded in it. */
export function newlySatisfiedMilestoneIds(
  definition: JourneyDefinition,
  state: JourneyState,
): string[] {
  return definition.milestones
    .filter((m) => !state.completedMilestoneIds.includes(m.id))
    .filter((m) => criteriaSatisfied(m.criteria, state))
    .map((m) => m.id);
}

export function pendingReflectionIds(
  definition: JourneyDefinition,
  state: JourneyState,
): string[] {
  return definition.reflections
    .filter((r) => state.completedEpisodeIds.includes(r.episodeId))
    .filter((r) => !state.completedReflectionIds.includes(r.id))
    .map((r) => r.id);
}

function percentComplete(definition: JourneyDefinition, state: JourneyState): number {
  const requiredPractices = definition.practices.filter(
    (p) => p.kind === "practice" && p.required !== false,
  );
  const totalRequired =
    definition.episodes.length + definition.livingWorlds.length + requiredPractices.length;
  if (totalRequired === 0) return state.status === "completed" ? 100 : 0;

  const completedRequired =
    state.completedEpisodeIds.length +
    state.visitedWorldIds.length +
    requiredPractices.filter((p) => state.completedPracticeIds.includes(p.id)).length;

  return Math.round((completedRequired / totalRequired) * 100);
}

export function computeProgress(
  definition: JourneyDefinition,
  state: JourneyState,
): JourneyProgress {
  return {
    journeyId: definition.id,
    status: state.status,
    percentComplete: percentComplete(definition, state),
    completedEpisodeIds: state.completedEpisodeIds,
    visitedWorldIds: state.visitedWorldIds,
    completedPracticeIds: state.completedPracticeIds.filter((id) =>
      definition.practices.some((p) => p.id === id && p.kind === "practice"),
    ),
    completedChallengeIds: state.completedPracticeIds.filter((id) =>
      definition.practices.some((p) => p.id === id && p.kind === "challenge"),
    ),
    completedReflectionIds: state.completedReflectionIds,
    pendingReflectionIds: pendingReflectionIds(definition, state),
    completedMilestoneIds: state.completedMilestoneIds,
    nextEpisode: nextEpisode(definition, state),
    nextLivingWorld: nextLivingWorld(definition, state),
    nextPractice: nextPractice(definition, state),
    isComplete: state.status === "completed",
  };
}
