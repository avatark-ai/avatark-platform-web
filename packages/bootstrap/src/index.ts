export { bootstrapProduct } from "./bootstrap.ts";
export type { ProductBootstrap, BootstrapOptions } from "./bootstrap.ts";

export { validateProductEnv } from "./envValidator.ts";
export type { ProductEnvInput, EnvIssue, EnvIssueSeverity, EnvValidationReport } from "./envValidator.ts";

export { checkProductConformance } from "./conformance.ts";
export type { ConformanceCheckId, ConformanceStatus, ConformanceCheckResult, ConformanceReport } from "./conformance.ts";

export {
  REFERENCE_ADAPTER_PRODUCT_IDS,
  referenceAdapters,
  avatarkAdapter,
  prometheuskAdapter,
  gamekAdapter,
  arenakAdapter,
  streamkAdapter,
  studiokAdapter,
} from "./referenceAdapters.ts";
export type { ReferenceAdapterProductId } from "./referenceAdapters.ts";
