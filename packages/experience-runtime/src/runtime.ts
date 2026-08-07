import type { JourneyAdapter } from "./adapter.ts";
import { noopJourneyAdapter } from "./adapter.ts";
import {
  computeProgress,
  isUnlocked,
  newlySatisfiedMilestoneIds,
  nextEpisode,
  nextLivingWorld,
  criteriaSatisfied,
} from "./progress.ts";
import type { JourneyRepository } from "./repository.ts";
import {
  JourneyError,
  type JourneyDefinition,
  type JourneyHistory,
  type JourneyProgress,
  type JourneyState,
  type JourneyTransition,
} from "./types.ts";

/** Orchestrates a single JourneyDefinition against a JourneyRepository, notifying a
 * JourneyAdapter of every transition. Contains no product-specific logic -- every
 * decision (what's next, what's unlocked, what counts as complete) reads from the
 * definition's own data. */
export class JourneyRuntime {
  private readonly definition: JourneyDefinition;
  private readonly repository: JourneyRepository;
  private readonly adapter: JourneyAdapter;

  constructor(
    definition: JourneyDefinition,
    repository: JourneyRepository,
    adapter: JourneyAdapter = noopJourneyAdapter,
  ) {
    this.definition = definition;
    this.repository = repository;
    this.adapter = adapter;
  }

  async start(subjectId: string): Promise<JourneyState> {
    const existing = await this.repository.getState(subjectId, this.definition.id);
    if (existing) {
      throw new JourneyError(
        `Journey "${this.definition.id}" already started for subject "${subjectId}" -- use resume()`,
      );
    }
    const now = Date.now();
    const state: JourneyState = {
      journeyId: this.definition.id,
      subjectId,
      status: "active",
      currentEpisodeId: this.definition.episodes[0]?.id ?? null,
      currentWorldId: null,
      activePracticeId: null,
      completedEpisodeIds: [],
      visitedWorldIds: [],
      completedPracticeIds: [],
      completedReflectionIds: [],
      completedMilestoneIds: [],
      startedAt: now,
      updatedAt: now,
    };
    return this.commit(state, { type: "started", at: now });
  }

  async resume(subjectId: string): Promise<JourneyState> {
    const state = await this.requireState(subjectId);
    if (state.status === "active") return state;
    if (state.status !== "paused") {
      throw new JourneyError(`Cannot resume journey from status "${state.status}"`);
    }
    const now = Date.now();
    const next: JourneyState = { ...state, status: "active", updatedAt: now };
    await this.recordTransition(next, { type: "resumed", at: now });
    return next;
  }

  async completeEpisode(subjectId: string, episodeId: string): Promise<JourneyState> {
    const state = await this.requireActive(subjectId);
    const episode = this.findOrThrow(this.definition.episodes, episodeId, "episode");
    if (state.completedEpisodeIds.includes(episodeId)) {
      throw new JourneyError(`Episode "${episodeId}" is already completed`);
    }
    if (!isUnlocked(episode, state)) {
      throw new JourneyError(`Episode "${episodeId}" is locked by its prerequisites`);
    }
    const now = Date.now();
    const newlyResolvedReflectionIds = this.definition.reflections
      .filter((r) => r.episodeId === episodeId)
      .map((r) => r.id)
      .filter((id) => !state.completedReflectionIds.includes(id));
    const next: JourneyState = {
      ...state,
      completedEpisodeIds: [...state.completedEpisodeIds, episodeId],
      completedReflectionIds: [...state.completedReflectionIds, ...newlyResolvedReflectionIds],
      updatedAt: now,
    };
    next.currentEpisodeId = nextEpisode(this.definition, next)?.id ?? null;
    return this.commit(next, { type: "episode_completed", at: now, nodeId: episodeId });
  }

  async enterWorld(subjectId: string, worldId: string): Promise<JourneyState> {
    const state = await this.requireActive(subjectId);
    const world = this.findOrThrow(this.definition.livingWorlds, worldId, "living world");
    if (!isUnlocked(world, state)) {
      throw new JourneyError(`Living world "${worldId}" is locked by its prerequisites`);
    }
    const now = Date.now();
    const next: JourneyState = {
      ...state,
      currentWorldId: worldId,
      visitedWorldIds: state.visitedWorldIds.includes(worldId)
        ? state.visitedWorldIds
        : [...state.visitedWorldIds, worldId],
      updatedAt: now,
    };
    return this.commit(next, { type: "world_entered", at: now, nodeId: worldId });
  }

  async beginPractice(subjectId: string, practiceId: string): Promise<JourneyState> {
    const state = await this.requireActive(subjectId);
    const practice = this.findOrThrow(this.definition.practices, practiceId, "practice");
    if (state.activePracticeId) {
      throw new JourneyError(`Practice "${state.activePracticeId}" is already in progress`);
    }
    if (state.completedPracticeIds.includes(practiceId)) {
      throw new JourneyError(`Practice "${practiceId}" is already completed`);
    }
    if (!isUnlocked(practice, state)) {
      throw new JourneyError(`Practice "${practiceId}" is locked by its prerequisites`);
    }
    const now = Date.now();
    const next: JourneyState = { ...state, activePracticeId: practiceId, updatedAt: now };
    return this.commit(next, { type: "practice_started", at: now, nodeId: practiceId });
  }

  async finishPractice(subjectId: string, practiceId: string): Promise<JourneyState> {
    const state = await this.requireActive(subjectId);
    this.findOrThrow(this.definition.practices, practiceId, "practice");
    if (state.activePracticeId !== practiceId) {
      throw new JourneyError(`Practice "${practiceId}" is not the currently active practice`);
    }
    const now = Date.now();
    const next: JourneyState = {
      ...state,
      activePracticeId: null,
      completedPracticeIds: [...state.completedPracticeIds, practiceId],
      updatedAt: now,
    };
    return this.commit(next, { type: "practice_finished", at: now, nodeId: practiceId });
  }

  /** Generic driver: moves the subject to whatever the definition's data says is
   * next (an unopened episode, then an unvisited living world), or records a no-op
   * "advanced" transition if nothing is currently eligible. */
  async advance(subjectId: string): Promise<JourneyState> {
    const state = await this.requireActive(subjectId);
    const now = Date.now();

    const upcomingEpisode = nextEpisode(this.definition, state);
    if (upcomingEpisode && upcomingEpisode.id !== state.currentEpisodeId) {
      const next: JourneyState = { ...state, currentEpisodeId: upcomingEpisode.id, updatedAt: now };
      return this.commit(next, {
        type: "advanced",
        at: now,
        nodeId: upcomingEpisode.id,
        detail: "episode",
      });
    }

    const upcomingWorld = nextLivingWorld(this.definition, state);
    if (upcomingWorld && upcomingWorld.id !== state.currentWorldId) {
      const next: JourneyState = {
        ...state,
        currentWorldId: upcomingWorld.id,
        visitedWorldIds: state.visitedWorldIds.includes(upcomingWorld.id)
          ? state.visitedWorldIds
          : [...state.visitedWorldIds, upcomingWorld.id],
        updatedAt: now,
      };
      return this.commit(next, {
        type: "advanced",
        at: now,
        nodeId: upcomingWorld.id,
        detail: "livingWorld",
      });
    }

    const next: JourneyState = { ...state, updatedAt: now };
    return this.commit(next, { type: "advanced", at: now, detail: "no eligible next step" });
  }

  async pause(subjectId: string): Promise<JourneyState> {
    const state = await this.requireState(subjectId);
    if (state.status !== "active") {
      throw new JourneyError(`Cannot pause journey from status "${state.status}"`);
    }
    const now = Date.now();
    const next: JourneyState = { ...state, status: "paused", updatedAt: now };
    await this.recordTransition(next, { type: "paused", at: now });
    return next;
  }

  async abandon(subjectId: string): Promise<JourneyState> {
    const state = await this.requireState(subjectId);
    if (state.status === "completed" || state.status === "abandoned") {
      throw new JourneyError(`Cannot abandon journey from status "${state.status}"`);
    }
    const now = Date.now();
    const next: JourneyState = {
      ...state,
      status: "abandoned",
      activePracticeId: null,
      updatedAt: now,
    };
    await this.recordTransition(next, { type: "abandoned", at: now });
    return next;
  }

  async history(subjectId: string): Promise<JourneyHistory> {
    const transitions = await this.repository.getHistory(subjectId, this.definition.id);
    return { journeyId: this.definition.id, subjectId, transitions };
  }

  async getProgress(subjectId: string): Promise<JourneyProgress | null> {
    const state = await this.repository.getState(subjectId, this.definition.id);
    if (!state) return null;
    return computeProgress(this.definition, state);
  }

  private async requireState(subjectId: string): Promise<JourneyState> {
    const state = await this.repository.getState(subjectId, this.definition.id);
    if (!state) {
      throw new JourneyError(
        `No journey "${this.definition.id}" started for subject "${subjectId}" -- call start() first`,
      );
    }
    return state;
  }

  private async requireActive(subjectId: string): Promise<JourneyState> {
    const state = await this.requireState(subjectId);
    if (state.status !== "active") {
      throw new JourneyError(`Journey is "${state.status}", not active`);
    }
    return state;
  }

  private findOrThrow<T extends { id: string }>(nodes: T[], id: string, label: string): T {
    const found = nodes.find((n) => n.id === id);
    if (!found) throw new JourneyError(`Unknown ${label} "${id}"`);
    return found;
  }

  /** Persists state + transition and notifies the adapter, with no milestone or
   * completion evaluation -- used by transitions (pause/abandon/resume) that never
   * change a completion-relevant set. */
  private async recordTransition(
    state: JourneyState,
    transition: JourneyTransition,
  ): Promise<void> {
    await this.repository.saveState(state);
    await this.repository.appendTransition(state.subjectId, state.journeyId, transition);
    await this.adapter.onTransition?.({
      subjectId: state.subjectId,
      journeyId: state.journeyId,
      transition,
      state,
    });
  }

  /** Records the given transition, then re-evaluates milestones and completion
   * criteria against the resulting state, recording any newly-earned milestone or
   * completion transitions in turn. */
  private async commit(
    state: JourneyState,
    transition: JourneyTransition,
  ): Promise<JourneyState> {
    await this.recordTransition(state, transition);

    let current = state;
    for (const milestoneId of newlySatisfiedMilestoneIds(this.definition, current)) {
      const now = Date.now();
      current = {
        ...current,
        completedMilestoneIds: [...current.completedMilestoneIds, milestoneId],
        updatedAt: now,
      };
      await this.recordTransition(current, { type: "milestone_reached", at: now, nodeId: milestoneId });
    }

    if (current.status === "active" && criteriaSatisfied(this.definition.completionCriteria, current)) {
      const now = Date.now();
      current = { ...current, status: "completed", updatedAt: now };
      await this.recordTransition(current, { type: "completed", at: now });
    }

    return current;
  }
}
