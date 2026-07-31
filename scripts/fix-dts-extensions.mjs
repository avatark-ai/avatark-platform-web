// This repo's package sources use explicit .ts extensions in relative
// imports (allowImportingTsExtensions, moduleResolution: bundler). tsc's
// --rewriteRelativeImportExtensions correctly rewrites those to .js in
// compiled .js output, but leaves the literal .ts specifier untouched in
// emitted .d.ts files (confirmed against TypeScript 5.9.3) -- a .d.ts
// importing "./types.ts" would force consumers to resolve a source file
// this package never ships. This is a small, targeted postbuild fixup,
// not a general-purpose tool: it only rewrites the exact pattern tsc emits.
import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node fix-dts-extensions.mjs <dir>");
  process.exit(1);
}

function walk(path) {
  for (const entry of readdirSync(path)) {
    const full = join(path, entry);
    if (statSync(full).isDirectory()) {
      walk(full);
    } else if (entry.endsWith(".d.ts")) {
      const before = readFileSync(full, "utf8");
      const after = before.replace(/(from\s+["'][^"']+)\.tsx?(["'])/g, "$1.js$2");
      if (after !== before) writeFileSync(full, after);
    }
  }
}

walk(dir);
