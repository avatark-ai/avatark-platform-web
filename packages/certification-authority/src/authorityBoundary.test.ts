// Static authority-boundary proofs for PLT-ADR-015 (§1, §3, §11, §14, §15).
import assert from "node:assert/strict"
import { test } from "node:test"
import { readFileSync, readdirSync } from "node:fs"

const SRC = new URL("./", import.meta.url)
const PACKAGES = new URL("../../", import.meta.url)

function sources(dir: URL): Array<{ file: string; text: string }> {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => ({ file: f, text: readFileSync(new URL(f, dir), "utf8") }))
}

test("AB1: the evaluator packages do not depend on or call the Certification Authority (evaluators stay pure and non-authoritative)", () => {
  for (const pkg of ["narrative-interpretation", "episode-compiler", "episode-semantic-generation"]) {
    for (const { file, text } of sources(new URL(`${pkg}/src/`, PACKAGES))) {
      assert.doesNotMatch(text, /certification-authority|createCertificationAuthority|CertificationRecord/, `${pkg}/${file}`)
    }
  }
})

test("AB2: the Authority imports no World/runtime mutation surface, no network, no publication authority", () => {
  const forbidden = /living-world-runtime|world-persistence|world-memory-runtime|narrative-runtime|experience-registry|fetch\(|XMLHttpRequest|authorize\(|publish/i
  for (const { file, text } of sources(SRC)) {
    const code = text.split("\n").filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*")).join("\n")
    assert.doesNotMatch(code, forbidden, file)
  }
})

test("AB3: the Authority package never reads process.env (key custody lives in the server-side host adapter only)", () => {
  for (const { file, text } of sources(SRC)) assert.doesNotMatch(text, /process\.env/, file)
})

test("AB4: no private key material is present in the package source", () => {
  for (const { file, text } of sources(SRC)) {
    assert.doesNotMatch(text, /BEGIN [A-Z ]*PRIVATE KEY|MC4CAQAwBQYDK2VwBCIEI/, file)
  }
})

test("AB5: automated/model invokers are not representable -- the invoker type is HUMAN-only", () => {
  const types = readFileSync(new URL("types.ts", SRC), "utf8")
  assert.match(types, /kind: "HUMAN"/)
  assert.doesNotMatch(types, /kind: "(MODEL|SERVICE|AUTOMATION|rule_engine|model)"/)
})
