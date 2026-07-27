import { test } from "node:test";
import assert from "node:assert/strict";
import { getContinuityAction } from "./continuity.ts";
import type { JourneyContext } from "./state.ts";

// Inlined rather than importing state.ts's own EMPTY_JOURNEY_CONTEXT
// value: state.ts pulls in lib/supabase/client via the "@/" alias, which
// Next's bundler resolves but this repo's plain `node --test` runner
// (see package.json's test script) does not -- the same reason every
// other file this runner exercises directly uses relative imports. The
// type-only import above is erased by --experimental-strip-types and
// never resolved at runtime, so it doesn't hit that problem.
const EMPTY: JourneyContext = {
  intention: null,
  witness: null,
  startedAt: null,
  lastSeenAt: null,
  practiceCompletedAt: null,
  invitationId: null,
  invitationAcceptedAt: null,
};

function context(overrides: Partial<JourneyContext>): JourneyContext {
  return { ...EMPTY, ...overrides };
}

test("no intention and no witness -> begin with an Echo", () => {
  const action = getContinuityAction(context({}));
  assert.equal(action.href, "/start");
  assert.equal(action.external, false);
});

test("intention only, no witness -> continue to the practice via the witness page", () => {
  const action = getContinuityAction(context({ intention: "calm" }));
  assert.equal(action.href, "/witness/the-promise-to-myself?intention=calm");
  assert.equal(action.external, false);
});

test("witness present -> return to the practice on PrometheusK, regardless of completion", () => {
  const inProgress = getContinuityAction(context({ intention: "calm", witness: "the-promise-to-myself" }));
  assert.equal(inProgress.external, true);
  assert.match(inProgress.href, /^https:\/\//);

  const completed = getContinuityAction(
    context({ intention: "calm", witness: "the-promise-to-myself", practiceCompletedAt: new Date().toISOString() })
  );
  assert.equal(completed.href, inProgress.href);
});

test("completed with no witness/intention yet (never visited /journey/today to absorb them) -> still returns to the practice, not 'Begin with an Echo' again", () => {
  const action = getContinuityAction(context({ practiceCompletedAt: new Date().toISOString() }));
  assert.equal(action.ctaLabel, "Return to your practice");
  assert.equal(action.external, true);
});
