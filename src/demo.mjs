// Node consumer of oresoftware/flags-2-env.
//
// Asserts the contract in EXPECTED.md. Exits non-zero on the first
// disagreement, which is what makes `docker run` the whole test.

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const vendor = join(repo, ".vendor/.zed/oresoftware/flags-2-env");

// Node is the one runtime in this org that does not go through FFI: the client
// loads a compiled N-API addon, resolved from FLAGS2ENV_NODE_ADDON, which the
// Dockerfile builds with node-gyp from the vendored source.
//
// pathToFileURL, not the bare path: a dynamic import of an absolute filesystem
// path happens to work on POSIX and is an error on Windows.
const { parse } = await import(pathToFileURL(join(vendor, "clients/nodejs/lib.mjs")).href);

const configPath = join(repo, ".cli-flags.toml");

const defaults = { PORT: "3000", DEBUG: "false", APP_ENV: "development", COLOR: "true" };
const overridden = { PORT: "8181", DEBUG: "true", APP_ENV: "production", COLOR: "true" };

const cases = [
  ["defaults", [], defaults],
  ["long flags", ["--port", "8181", "--debug=t", "--mode", "production"], overridden],
  ["short flags", ["-p", "8181", "-d", "1", "--env", "production"], overridden],
  ["long aliases", ["--listen-port", "8181", "--debug", "1", "--mode", "production"], overridden],
  ["joined by =", ["--port=8181", "--debug=yes", "--mode=production"], overridden],
  ["negation", ["--no-color"], { ...defaults, COLOR: "false" }],
];

let failures = 0;

for (const [label, flags, expected] of cases) {
  const got = parse(["demo", ...flags], { configPath });
  const keys = Object.keys(expected).sort();
  const ok = keys.every((key) => got[key] === expected[key]) &&
    Object.keys(got).length === keys.length;

  if (!ok) failures += 1;
  console.log(`${(ok ? "ok" : "FAIL").padEnd(4)} ${label.padEnd(13)} demo ${flags.join(" ")}`);
  for (const key of keys) console.log(`       ${key}=${got[key] ?? "<missing>"}`);
  if (!ok) {
    console.error(`       expected ${JSON.stringify(expected)}`);
    console.error(`       got      ${JSON.stringify(got)}`);
  }
}

if (failures > 0) {
  console.error(`\nnodejs-app: ${failures} of ${cases.length} cases disagree with the contract`);
  process.exit(1);
}

console.log(`\nnodejs-app OK: ${cases.length} cases, via the N-API addon from oresoftware/flags-2-env`);
