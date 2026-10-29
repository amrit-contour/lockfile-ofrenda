import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { parseLockfileJson, parseLockfileText } from "./parseLockfile.ts";
import { groundEulogy, templateEulogy } from "./ground.ts";
import { scoreOffering } from "./score.ts";
import type { RegistryFacts } from "./registry.ts";

const sample = readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "../samples/demo-lock.json"),
  "utf8",
);

test("parses npm v3 lockfile including transitive names", () => {
  const entries = parseLockfileText(sample);
  const names = entries.map((e) => e.name);
  assert.ok(names.includes("request"));
  assert.ok(names.includes("jade"));
  assert.equal(entries.find((e) => e.name === "request")?.isDirect, true);
  assert.equal(entries.find((e) => e.name === "jade")?.isDirect, false);
});

test("rejects non-lock JSON", () => {
  assert.throws(() => parseLockfileJson({ foo: 1 }));
});

test("silent packages older than two years are ghosts", () => {
  const facts: RegistryFacts = {
    name: "request",
    lockedVersion: "2.88.2",
    isDirect: true,
    latestVersion: "2.88.2",
    lastPublish: "2020-02-11T00:00:00.000Z",
    lastPublishDays: 2400,
    deprecatedLocked: "request has been deprecated",
    deprecatedLatest: "request has been deprecated",
    maintainers: ["mikeal"],
    license: "Apache-2.0",
    description: "Simplified HTTP request client.",
    unpublished: false,
    error: null,
  };
  const scored = scoreOffering(facts);
  assert.equal(scored.isGhost, true);
  assert.ok(scored.reasons.includes("deprecated"));
  assert.ok(scored.reasons.includes("silent"));
});

test("grounding drops a sentence that invents a successor year", () => {
  const facts: RegistryFacts = {
    name: "jade",
    lockedVersion: "1.11.0",
    isDirect: false,
    latestVersion: "1.11.0",
    lastPublish: "2015-06-12T00:00:00.000Z",
    lastPublishDays: 4000,
    deprecatedLocked: "Jade has been renamed to pug",
    deprecatedLatest: "Jade has been renamed to pug",
    maintainers: [],
    license: "MIT",
    description: "Jade template engine",
    unpublished: false,
    error: null,
  };
  const result = groundEulogy(
    "Jade is locked at 1.11.0. It was rewritten in 2024 by a secret committee.",
    facts,
  );
  assert.equal(result.refused, false);
  assert.ok(result.text.includes("1.11.0"));
  assert.ok(result.dropped.some((s) => s.includes("2024")));
});

test("template eulogy stays inside the record", () => {
  const facts: RegistryFacts = {
    name: "colors",
    lockedVersion: "1.4.0",
    isDirect: true,
    latestVersion: "1.4.0",
    lastPublish: "2019-09-22T00:00:00.000Z",
    lastPublishDays: 2500,
    deprecatedLocked: null,
    deprecatedLatest: null,
    maintainers: ["marak"],
    license: "MIT",
    description: "get colors in your node.js console",
    unpublished: false,
    error: null,
  };
  const text = templateEulogy(facts);
  assert.ok(text.includes("colors"));
  assert.ok(text.includes("1.4.0"));
  assert.ok(!text.toLowerCase().includes("cve"));
});
