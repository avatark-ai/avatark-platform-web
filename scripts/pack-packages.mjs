// Produces versioned, checksummed tarballs for all 14 @avatark/* packages
// -- the actual distributable artifact for cross-repo consumers (see
// docs/PLATFORM_PACKAGE_DISTRIBUTION.md). Requires scripts/build-packages.mjs
// to have run first (dist/ must exist). Writes tarballs + a checksum
// manifest to dist-packages/ at the repo root.
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const PACKAGES = [
  "account-ui", "auth", "identity", "invitations", "journey", "living-echo",
  "membership", "motion", "navigation", "notifications", "organizations",
  "product-registry", "recommendations", "timeline",
];

const OUT_DIR = "dist-packages";
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR);

const manifest = [];

for (const name of PACKAGES) {
  const pkgDir = join("packages", name);
  if (!existsSync(join(pkgDir, "dist"))) {
    console.error(`missing dist/ for ${name} -- run scripts/build-packages.mjs first`);
    process.exit(1);
  }

  console.log(`\n=== packing @avatark/${name} ===`);
  const output = execSync("pnpm pack --pack-destination ../../" + OUT_DIR, { cwd: pkgDir }).toString().trim();
  const absoluteTarballPath = output.split("\n").pop().trim();
  const tarballName = basename(absoluteTarballPath);
  const tarballPath = join(OUT_DIR, tarballName);

  const bytes = readFileSync(tarballPath);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  manifest.push({ package: `@avatark/${name}`, tarball: tarballName, sha256: checksum, bytes: bytes.length });
  console.log(`${tarballName}  sha256:${checksum}`);
}

writeFileSync(join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nWrote ${OUT_DIR}/manifest.json (${manifest.length} packages).`);
