import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Real, deliberate addition: supabase/scripts/** are standalone Node
    // CommonJS tooling scripts, run directly via `node`, not through
    // Next.js's bundler -- they intentionally use require() rather than
    // ESM import syntax, and should not be held to the app's
    // TypeScript/ESM conventions.
    "supabase/scripts/**",
  ]),
]);

export default eslintConfig;
