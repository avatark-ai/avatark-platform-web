# Runtime Kernel Merge Report

What actually happened during the Runtime Kernel Integration (Sprint 3), on
branch `feature/runtime-kernel-integration` (based off `feature/avatar-platform-rc3`
at `dc6bee2`). Every commit hash below is real and can be inspected directly.

## Phase 1 — branch-head re-verification

Before any change, every source branch's head was confirmed to still match
Sprint 2's analyzed state exactly:

| Branch | Sprint 2 recorded head | Re-verified head at Sprint 3 start | Drift? |
|---|---|---|---|
| `feature/narrative-runtime` | `eb6def1` | `eb6def1` | None |
| `feature/living-world-runtime` | `b7a986d` | `b7a986d` | None |
| `feature/experience-registry` | `a9c0bb2` | `a9c0bb2` | None |
| `feature/context-runtime` | `1640997` | `1640997` | None |
| `feature/experience-runtime` | `4c1baef` | `4c1baef` | None |
| `feature/runtime-kernel-sprint-2` | `dc8cab9` | `dc8cab9` | None |
| `feature/avatar-platform-rc3` (base) | `dc6bee2` | `dc6bee2` | None |

No drift on any branch. Integration proceeded as planned, with no need to stop
and report a mismatch.

## Merge checkpoints and commit hashes

| Step | Commit | What it did |
|---|---|---|
| Phase 2 | `3ec2d7c` | Implemented `packages/runtime-contracts` (dependency-free, 8 structural tests) |
| Phase 4, checkpoint 1/5 | `7486b5b` | Merged `feature/narrative-runtime` — 604/604 tests, zero cross-runtime imports |
| Phase 4, checkpoint 2/5 | `fe0e121` | Merged `feature/living-world-runtime` — 633/633 tests; added the root `package.json` dependency entry this branch never added itself |
| Phase 4, checkpoint 3/5 | `a820470` | Merged `feature/experience-registry` — 670/670 tests; first migration-bearing branch (023 unrenumbered at this point) |
| Phase 4, checkpoint 4/5 | `6326979` | Merged `feature/context-runtime` — 704/704 tests; first merge touching already-live shared code (`lib/account/adapters.ts`), diffed byte-identical against the source branch |
| Phase 4, checkpoint 5/5 | `01bfa6c` | Merged `feature/experience-runtime` — 724/724 tests; fixed its missing `scripts/build-packages.mjs` registration; diffed `app/account/page.tsx` byte-identical against the source branch |
| Phase 3 | `bea2569` | Resolved the user-facing "Journey" naming ambiguity — visible copy only, plus forward-compatible export aliases |
| Phase 5 | `a4d99ae` | Moved the two misplaced account-adapter files from inside their runtime packages to host `lib/` |
| Phase 6 | `5b42b82` | Reconciled the 3-way migration `023` collision (→ `023`/`024`/`025`) |
| Phase 8 | `b893c68` | Added the one host composition helper, `enterLivingWorld()` |
| Phase 9 | `a74e178` | Added the 10-step, 5-runtime, content-free reference E2E test |
| Phase 10 | `707821a` | Added the 13-test static dependency-boundary check |

All twelve commits are on `feature/runtime-kernel-integration` only. Verified
after every single merge/commit that none of the five source branches or
`feature/avatar-platform-rc3` moved (all re-checked against their recorded
hashes at the end of this sprint — see the final report for the confirmation).

## Why Phase 3 (naming) ran after Phase 4 (merges), not before

The mission listed naming resolution as Phase 3, before the merges in Phase 4.
This report deviates from that literal ordering, on purpose: renaming or
aliasing types *before* merging `feature/experience-runtime` would mean
editing a copy of files that then get merged over by `git merge`, creating an
unnecessary conflict with the incoming branch's own commits. Applying the
naming fix as an isolated commit *after* all five merges landed is strictly
safer — it's the exact same change, with no merge-conflict risk, and it stays
a single, easily-revertable commit if the naming call needs revisiting. The
actual fix (Phase 3's content) is otherwise done exactly as specified: no
architecture redesign, least-disruptive user-facing-copy-only change,
compatibility aliases documented.

## Phase 7 — `@avatark/timeline` vs `@avatark/experience-registry`

**No code change.** Per this sprint's explicit instruction ("Do NOT delete or
rewrite Timeline... No broad cleanup"), `packages/timeline` is untouched —
confirmed via `git diff feature/avatar-platform-rc3..HEAD -- packages/timeline`
returning empty.

**The relationship, documented:** `@avatark/timeline` is a pre-existing,
contract-only package (`TimelineEntry`/`TimelineEventType`, 10 fixed kinds,
`TimelineAdapter` — no implementation anywhere, by its own file's admission).
`@avatark/experience-registry` is, in substance, the real implementation of
the same underlying idea (an append-only, per-user, product-tagged event log)
— open-ended event-type strings instead of a closed 10-value enum, a real
repository interface, an in-memory reference implementation, and four query
methods. Sprint 1's audit flagged this as a reconciliation question; this
sprint does not resolve it, per its own "defer replacement/deprecation unless
Sprint 2 already established a safe path" instruction — Sprint 2's report
flagged the question but did not establish a migration path, so no path exists
to follow here. No compatibility adapter between the two was built, since none
was explicitly required (neither package is wired to a consumer that would
need one yet — `timeline`, per Sprint 1's audit, has zero implementation to
bridge *from*, and `experience-registry`'s own account-facing adapter, moved
this sprint to `lib/experienceRegistry/accountAdapter.ts`, targets
`@avatark/account`'s `ExtensionAdapter`, not `TimelineAdapter`).

**Recommendation, unchanged from Sprint 1/2:** this decision belongs to
whoever eventually owns the account activity-stream UI, not to an integration
pass. The window to reconcile the two packages stays cheap as long as neither
has a real consumer — which remains true after this sprint.

## Conflict inventory: what actually conflicted, versus what was predicted

[MERGE_PLAYBOOK.md](./MERGE_PLAYBOOK.md) (written in Sprint 2, before any
merge happened) predicted the shared-file conflict surface. Comparing
prediction to reality:

| Predicted conflict | Actually occurred? | Notes |
|---|---|---|
| `package.json` test-script line, every merge | ✅ Yes, all 5 merges | Resolved by keeping both sides' additions each time |
| `package.json` dependencies-list line | Partially — only when two branches inserted at the exact same array position | Occurred for `context-runtime`↔`experience-runtime` (both after `bootstrap`) and `context-runtime`↔`experience-registry` (both after `bootstrap`); did NOT occur for `narrative-runtime`/`living-world-runtime` (different insertion points, auto-merged clean) |
| `pnpm-lock.yaml`, every merge | ✅ Yes, for the two merges after the first (context-runtime, experience-runtime) | Never hand-merged — regenerated via `pnpm install` each time, per the playbook's own recommendation |
| `scripts/build-packages.mjs` leaves array | ✅ Yes, for narrative/living-world/experience-registry/context-runtime | Resolved by combining both sides' package names into one array |
| `scripts/pack-packages.mjs` | Predicted only `context-runtime` would touch this; confirmed true | No conflict (only one branch touched it); fixed at Phase 4's final checkpoint by manually adding the other four kernel packages, since none of the other four branches had registered themselves there either — a gap the playbook flagged but didn't fully quantify until this pass |
| `lib/account/adapters.ts`, `app/account/page.tsx` — live-file drift risk | ✅ Checked, confirmed **no drift** | Both diffed byte-identical against their source branches at merge time |
| `experience-runtime` missing from `scripts/build-packages.mjs` | ✅ Confirmed still missing, fixed at merge time | Exactly as the playbook predicted |

The playbook's predictions held up well — no conflict occurred that wasn't
anticipated, and the one under-specified item (how many packages were
actually missing from `pack-packages.mjs`) was a minor gap in degree, not
in kind.
