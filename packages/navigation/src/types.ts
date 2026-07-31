// Contract only this phase. Three real, live nav/header/footer
// implementations exist today (InstitutionalHeader/Footer for the
// marketing shell, EchoHeader/EchoAvatarMenu/EchoFooter for the app,
// AdminNav for /admin) with zero convergence between them -- unifying
// their UI would be a redesign of three separate live surfaces, out of
// scope for a "no UI redesign / no behavior change" phase. This package
// names the one piece of vocabulary they could share (which of three
// states a viewer is in) so a future consolidation has a real contract
// to build against, without moving or touching any of today's components.
export type NavViewerState = "anonymous" | "signed_in" | "admin"
