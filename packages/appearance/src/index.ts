export type { AppearanceMode, AppearanceModeState, AppearanceModeDescriptor, ProductAccent, AppearancePreference } from './types.ts'
export { APPEARANCE_MODE_REGISTRY, PRODUCT_ACCENTS, DEFAULT_APPEARANCE_MODE } from './registry.ts'
export {
  getConsumerFacingModes,
  isModeConsumerFacing,
  resolveConsumerMode,
  getProductAccent,
  HYDRATION_SAFE_SCRIPT_SNIPPET,
} from './helpers.ts'
