import assert from "node:assert/strict";
import test from "node:test";

import {
  buildDecisionSchema,
  loadSuite,
  main,
  parseArgs,
  scoreDecision,
  summarize,
  validateDecision,
} from "../run_behavior_evals.mjs";

test("offline golden fixture passes every assertion", async () => {
  const code = await main([
    "--responses",
    "evals/fixtures/perfect-responses.json",
    "--threshold",
    "1",
  ]);
  assert.equal(code, 0);
});

test("runner defaults to a no-cost dry run", async () => {
  assert.equal(await main([]), 0);
});

test("live mode requires an explicit model and bounded options", () => {
  assert.throws(() => parseArgs(["--live"]), /requires --model/);
  assert.throws(() => parseArgs(["--live", "--model", "example", "--runs", "11"]), /cannot exceed 10/);
  assert.throws(() => parseArgs(["--threshold", "1.1"]), /between 0 and 1/);
  assert.throws(() => parseArgs(["--max-requests", "501"]), /cannot exceed 500/);
  assert.throws(() => parseArgs(["--max-input-bytes", "262145"]), /cannot exceed 262144/);
  assert.throws(() => parseArgs(["--unknown"]), /Unknown option/);
});

test("decision validation rejects values outside repository catalogs", async () => {
  const suite = await loadSuite();
  const valid = {
    mode: "direct",
    skill: "none",
    profile: "none",
    guide: "none",
    behaviors: [],
    rationale: "Focused local change.",
  };
  assert.equal(validateDecision(valid, suite), valid);
  assert.throws(() => validateDecision({ ...valid, skill: "invented-skill" }, suite), /Invalid skill/);
  assert.throws(() => validateDecision({ ...valid, behaviors: ["invented_behavior"] }, suite), /Invalid behaviors/);
  assert.throws(() => validateDecision({ ...valid, mode: "skill" }, suite), /requires a selected skill/);
});

test("scoring treats forbidden behavior as an explicit failed assertion", () => {
  const result = scoreDecision(
    { id: "negative", expected: { mode: "direct", forbidden_behaviors: ["long_plan"] } },
    { mode: "direct", behaviors: ["long_plan"] },
  );
  assert.equal(result.score, 0.5);
  assert.deepEqual(result.failed_assertions, ["forbids:long_plan"]);
});

test("structured schema closes the object and enumerates discovered routes", async () => {
  const suite = await loadSuite();
  const schema = buildDecisionSchema(suite);
  assert.equal(schema.additionalProperties, false);
  assert.ok(schema.properties.skill.enum.includes("vibe-development"));
  assert.ok(schema.properties.profile.enum.includes("frontend"));
  assert.ok(schema.properties.guide.enum.includes("nextjs"));
});

test("critical failures override an otherwise passing aggregate score", () => {
  const summary = summarize([
    { id: "critical", critical: true, runs: [{ score: 0.5, passed: 1, total: 2 }] },
    { id: "ordinary", critical: false, runs: [{ score: 1, passed: 10, total: 10 }] },
  ], 0.9);
  assert.ok(summary.score > 0.9);
  assert.deepEqual(summary.critical_failures, ["critical"]);
  assert.equal(summary.passed, false);
});
