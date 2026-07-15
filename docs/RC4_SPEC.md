# RC4 — Platform / Prometheus Integration

Recorded verbatim 2026-07-15, after RC3 (Echo & Invitations) shipped and was
hosted-verified, to survive any future session interruption (the original
RC4 briefing was given verbally in a session lost to a Cloud Workstation
restart, and had to be re-supplied by the user).

```
============================================
RC4 — Platform / Prometheus Integration
============================================

OBJECTIVE: Make product boundaries disappear. Platform → Prometheus → Platform should feel like one seamless experience.

IMPLEMENT:
- Canonical return contract
- Journey synchronization
- Practice continuation
- Recommendation entry
- Living Echo preview

DO NOT:
- Duplicate practice runtime.
- Duplicate reflection runtime.
- Duplicate evidence.
- Duplicate recommendations.

DELIVERABLES: Integration report, route contracts, hosted verification.

============================================
TESTING CADENCE
============================================

After every commit: lint, typecheck, production build — fix before moving on.

After RC4 is fully implemented: run a full hosted Playwright verification covering Platform → PrometheusK → Platform as one continuous flow — canonical return contract, journey sync, practice continuation, recommendation entry, Living Echo preview. This is the deep integration checkpoint; do not abbreviate it, since RC5 (Episode 000 / Threshold) will be built directly on top of this boundary.

============================================
GLOBAL RULES
============================================

- Preserve every RC1 stop condition: no canonical PrometheusK route suitable → stop and report; returnTo cannot be honored → stop and report; a new cross-product database table would be required → stop and report; sensitive reflection text would need to go in a URL → stop and report; cross-domain auth becomes required → stop and report.
- Do not begin RC5 (Episode 000 / Threshold / practitioner archetype) or RC6 (beta audit) — out of scope here.
- Small, separate commits, each buildable independently.
- Do not claim end-to-end verification unless it was actually run hosted, in a real browser — you already established this discipline in RC3, keep it.

============================================
FINAL OUTPUT
============================================

RC4 integration report, route contracts, hosted Playwright verification results (exact pass/fail per flow segment), commit list, and any stop conditions triggered.
```

## Status

Spec recorded 2026-07-15. RC4 is complete as of the same day: two of
five deliverables (practice continuation, recommendation entry) were
implemented; three (canonical return contract, journey synchronization,
Living Echo preview) hit real stop conditions and were reported rather
than worked around. See `docs/RC4_ROUTE_CONTRACT.md` for the audit and
`docs/RC4_INTEGRATION_REPORT.md` for the full outcome, commit list, and
hosted verification results.
