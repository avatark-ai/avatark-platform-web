// Builds every @avatark/* package to real dist/ output (compiled .js +
// .d.ts), in dependency order, so cross-repo consumers can install a
// tarball instead of raw TypeScript source (see
// docs/PLATFORM_PACKAGE_DISTRIBUTION.md). Order is hand-listed rather than
// computed, matching the dependency graph confirmed by direct source
// audit: leaves first, then packages that import other @avatark/*
// packages, so a dependency's dist/ always exists before a dependent
// package's build resolves it via the pnpm workspace symlink.
import { execSync } from "node:child_process";

const BUILD_ORDER = [
  // Leaves: zero @avatark/* dependencies.
  "auth", "identity", "product-registry", "timeline", "recommendations",
  "membership", "invitations", "notifications", "organizations", "motion",
  "account", "locale", "appearance",
  // Runtime Kernel (also leaves: zero @avatark/* dependencies).
  "runtime-contracts", "narrative-runtime",
  // One hop: each depends only on leaves above.
  "navigation",     // -> product-registry
  "living-echo",    // -> timeline, recommendations
  "journey",        // -> auth, invitations
  "auth-ui",        // -> auth, product-registry
  // Two hops: depends on packages built in the previous tier.
  "account-ui",     // -> journey, membership, product-registry
  "bootstrap",      // -> product-registry, navigation
];

for (const name of BUILD_ORDER) {
  console.log(`\n=== building @avatark/${name} ===`);
  execSync("pnpm run build", { cwd: `packages/${name}`, stdio: "inherit" });
}

console.log(`\nAll ${BUILD_ORDER.length} packages built.`);
