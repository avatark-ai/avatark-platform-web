import { bootstrapProduct, type ProductBootstrap } from "./bootstrap.ts";

// Reference adapters -- one line of glue per product, each just calling
// bootstrapProduct() with that product's own id. This is deliberately
// all six adapters need: any per-product logic beyond "which id am I"
// would be exactly the kind of product-specific coupling this phase's
// mission explicitly warns against ("Avoid product-specific logic").
//
// These are REFERENCE adapters, not live integrations. This repo has no
// access to gamek-web/prometheusk-web/dt4m-os's ArenaK app/streamk-web/
// studiok's own runtime environments, so none of the five non-AvatarK
// adapters below is called with a real `env` -- each is exactly the
// starter file that product's own repo should copy verbatim (renaming
// nothing but the id it's parameterized with), then pass its own real
// environment variables into. See docs/PRODUCT_BOOTSTRAP.md and each
// product's own docs/MIGRATION_<PRODUCT>.md for the copy-paste version
// with real env wiring shown.
//
// AvatarK's own adapter is the one exception worth calling out: this
// repo genuinely *is* avatark, so `avatarkAdapter` below reflects real,
// live registry/capability data -- it just isn't wired with process.env
// values here either, since this file must stay a pure, side-effect-free
// module (no environment reads at import time, consistent with every
// other package in this workspace).

export const REFERENCE_ADAPTER_PRODUCT_IDS = [
  "avatark",
  "prometheusk",
  "gamek",
  "arenak",
  "streamk",
  "studiok",
] as const;

export type ReferenceAdapterProductId = (typeof REFERENCE_ADAPTER_PRODUCT_IDS)[number];

export const referenceAdapters: Record<ReferenceAdapterProductId, ProductBootstrap> = Object.fromEntries(
  REFERENCE_ADAPTER_PRODUCT_IDS.map((id) => [id, bootstrapProduct(id)])
) as Record<ReferenceAdapterProductId, ProductBootstrap>;

export const avatarkAdapter = referenceAdapters.avatark;
export const prometheuskAdapter = referenceAdapters.prometheusk;
export const gamekAdapter = referenceAdapters.gamek;
export const arenakAdapter = referenceAdapters.arenak;
export const streamkAdapter = referenceAdapters.streamk;
export const studiokAdapter = referenceAdapters.studiok;
