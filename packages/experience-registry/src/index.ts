export * from "./types.ts"
export * from "./eventTypes.ts"
export * from "./validation.ts"
export * from "./repository.ts"
export * from "./inMemoryRepository.ts"
export * from "./registry.ts"

// Account-surface adapter glue (createExperienceActivityAdapter and
// friends) moved to lib/experienceRegistry/accountAdapter.ts during the
// Runtime Kernel integration (Sprint 3) -- a Presentation-role adapter
// belongs in the Host, not in this leaf package. See
// docs/RUNTIME_KERNEL_ARCHITECTURE.md Part 1.
