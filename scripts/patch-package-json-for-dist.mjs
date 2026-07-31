// One-time transform (idempotent, safe to re-run): give every packages/*
// package a real, buildable dist/ output for cross-repo tarball
// distribution, WITHOUT changing how this repo itself consumes them.
//
// Top-level main/types/exports stay pointed at src/index.ts, exactly as
// before -- Next.js's own bundler resolves raw .ts workspace packages
// directly, and requiring a build step before every `pnpm dev`/`typecheck`
// would slow down this repo's own inner dev loop for no benefit. Only
// `publishConfig` (the standard npm/pnpm mechanism for "what a consumer
// gets when this is packed/published, independent of what the workspace
// itself resolves") points at dist/ -- `pnpm pack` merges publishConfig
// over the base fields when producing the tarball's package.json, so an
// external repo installing the tarball gets compiled dist/ output, never
// raw source.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
  "account-ui", "auth", "identity", "invitations", "journey", "living-echo",
  "membership", "motion", "navigation", "notifications", "organizations",
  "product-registry", "recommendations", "timeline",
];

const BUILD_SCRIPT =
  "tsc -p tsconfig.json --outDir dist --declaration --noEmit false " +
  "--rewriteRelativeImportExtensions --module esnext --moduleResolution bundler && " +
  "node ../../scripts/fix-dts-extensions.mjs dist";

for (const name of PACKAGES) {
  const path = join("packages", name, "package.json");
  const pkg = JSON.parse(readFileSync(path, "utf8"));

  // Restore the original src-pointing shape for in-repo consumption.
  pkg.types = "./src/index.ts";
  pkg.exports = {
    ".": { types: "./src/index.ts", default: "./src/index.ts" },
  };
  delete pkg.main;
  delete pkg.module;
  delete pkg.type;

  pkg.files = ["dist"];
  pkg.scripts = { ...(pkg.scripts ?? {}), build: BUILD_SCRIPT };
  pkg.publishConfig = {
    main: "./dist/index.js",
    module: "./dist/index.js",
    types: "./dist/index.d.ts",
    type: "module",
    exports: {
      ".": {
        types: "./dist/index.d.ts",
        import: "./dist/index.js",
        default: "./dist/index.js",
      },
    },
  };

  // Real gap found by audit: journey imports @avatark/invitations in source
  // (manifest.ts, recovery.ts) but never declared it as a dependency --
  // only worked by accident via pnpm's flat workspace hoisting.
  if (name === "journey" && !pkg.dependencies?.["@avatark/invitations"]) {
    pkg.dependencies = { ...(pkg.dependencies ?? {}), "@avatark/invitations": "workspace:*" };
  }

  writeFileSync(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`patched ${path}`);
}
