import type { JourneyState, JourneyTransition } from "./types.ts";

export interface JourneyTransitionEvent {
  subjectId: string;
  journeyId: string;
  transition: JourneyTransition;
  state: JourneyState;
}

/** The runtime's only extension point for product-specific behavior. A product
 * (StreamK, GameK, ArenaK, ...) that wants to react to journey events (analytics,
 * unlocking in-product content, notifications, ...) implements this instead of the
 * runtime special-casing that product. Optional by design -- most transitions have
 * no side effect a given product cares about. */
export interface JourneyAdapter {
  onTransition?(event: JourneyTransitionEvent): void | Promise<void>;
}

export const noopJourneyAdapter: JourneyAdapter = {};
