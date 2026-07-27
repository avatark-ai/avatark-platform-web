"use client";

import { useEffect } from "react";
import { readGuestContext, writeGuestContext, type GuestJourneyStep } from "@/lib/journey/guestContext";

// A silent client island for pages a guest journey passes through after
// "Continue as guest" (see InvitationAcceptGate.tsx): Watch First and the
// practice intro. Only ever *updates* an already-active guest context --
// never creates one, so visiting these pages outside a guest journey (a
// signed-in visitor, or a signed-out one who arrived without accepting an
// invitation first) leaves no trace in localStorage.
export function GuestJourneyTracker({
  step,
  watchFirstContentId = null,
  intendedPracticeId = null,
}: {
  step: GuestJourneyStep;
  watchFirstContentId?: string | null;
  intendedPracticeId?: string | null;
}) {
  useEffect(() => {
    if (!readGuestContext()) return;
    const patch: { step: GuestJourneyStep; watchFirstContentId?: string | null; intendedPracticeId?: string | null } = {
      step,
    };
    if (watchFirstContentId !== null) patch.watchFirstContentId = watchFirstContentId;
    if (intendedPracticeId !== null) patch.intendedPracticeId = intendedPracticeId;
    writeGuestContext(patch);
  }, [step, watchFirstContentId, intendedPracticeId]);

  return null;
}
