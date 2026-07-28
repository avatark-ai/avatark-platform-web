// ============================================================
// Integration Adapters -- interfaces only. "AvatarK becomes the
// coordinator between repositories" means this repo can describe what a
// handoff to another product would look like and whether that product's
// side of it exists today -- it never actually calls out. Every method
// on every adapter is synchronous and side-effect-free (no Promise, no
// fetch, nothing a future implementer could quietly turn into a network
// call) -- the strongest way to keep "no networking, no HTTP" true by
// construction, not just by convention.
export type AdapterAvailability = "available" | "not_implemented";

export interface AdapterDescribeResult {
  /** Would this specific handoff be accepted today, given its exact payload. */
  accepted: boolean;
  /** Whether the adapter mechanism itself exists at all, independent of any one handoff. */
  availability: AdapterAvailability;
  /** Honest, human-facing explanation -- never a fabricated success. */
  message: string;
}

export interface IntegrationAdapter<THandoff> {
  readonly productId: string;
  readonly displayName: string;
  /** Pure: describes what would happen, does nothing. `null` means no handoff has been built yet (e.g. missing required manifest data). */
  describeHandoff(handoff: THandoff | null): AdapterDescribeResult;
}
