import type { JourneyState, JourneyTransition } from "./types.ts";

/** Storage boundary the runtime depends on -- an interface, not an implementation,
 * so each product (or this repo's own app) can back it with whatever persistence
 * it already has (Postgres, KV, etc.) without the runtime knowing which. */
export interface JourneyRepository {
  getState(subjectId: string, journeyId: string): Promise<JourneyState | null>;
  saveState(state: JourneyState): Promise<void>;
  appendTransition(
    subjectId: string,
    journeyId: string,
    transition: JourneyTransition,
  ): Promise<void>;
  getHistory(subjectId: string, journeyId: string): Promise<JourneyTransition[]>;
}

function key(subjectId: string, journeyId: string): string {
  return `${subjectId}::${journeyId}`;
}

/** Reference implementation used by tests and available to any host that has no
 * durable store wired up yet. Not meant to be the production repository for a
 * real product -- those should implement `JourneyRepository` against their own store. */
export class InMemoryJourneyRepository implements JourneyRepository {
  private readonly states = new Map<string, JourneyState>();
  private readonly histories = new Map<string, JourneyTransition[]>();

  async getState(subjectId: string, journeyId: string): Promise<JourneyState | null> {
    return this.states.get(key(subjectId, journeyId)) ?? null;
  }

  async saveState(state: JourneyState): Promise<void> {
    this.states.set(key(state.subjectId, state.journeyId), state);
  }

  async appendTransition(
    subjectId: string,
    journeyId: string,
    transition: JourneyTransition,
  ): Promise<void> {
    const k = key(subjectId, journeyId);
    const existing = this.histories.get(k) ?? [];
    this.histories.set(k, [...existing, transition]);
  }

  async getHistory(subjectId: string, journeyId: string): Promise<JourneyTransition[]> {
    return this.histories.get(key(subjectId, journeyId)) ?? [];
  }
}
