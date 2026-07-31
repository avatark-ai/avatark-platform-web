// One-time transform: exclude *.test.ts from each package's build tsconfig
// so published dist output never ships test files. Safe to re-run.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PACKAGES = [
  "account-ui", "auth", "identity", "invitations", "journey", "living-echo",
  "membership", "motion", "navigation", "notifications", "organizations",
  "product-registry", "recommendations", "timeline",
];

for (const name of PACKAGES) {
  const path = join("packages", name, "tsconfig.json");
  const config = JSON.parse(readFileSync(path, "utf8"));
  const exclude = new Set(config.exclude ?? []);
  exclude.add("src/**/*.test.ts");
  config.exclude = [...exclude];
  writeFileSync(path, JSON.stringify(config, null, 2) + "\n");
  console.log(`patched ${path}`);
}
