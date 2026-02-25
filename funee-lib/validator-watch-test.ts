/**
 * Validator Watch Mode Test
 * 
 * This is a manual/integration test for runScenariosWatch.
 * Since watch mode runs indefinitely, this test runs for a short
 * duration and verifies the initial scenario execution works.
 * 
 * To test the full watch functionality:
 * 1. Run this script: funee funee-lib/validator-watch-test.ts
 * 2. Modify a file in the watched directory
 * 3. Observe re-run of scenarios
 * 4. Press Ctrl+C to stop
 */

import { log, scenario, runScenarios, assertThat, is, Closure } from "funee";
import type { Scenario } from "funee";

// Helper to create inline closures (same as validator-demo.ts)
const verify = <T>(fn: T): Closure<T> => ({
  expression: fn,
  references: new Map(),
});

// Test scenarios
const scenarios: Array<Scenario> = [
  scenario({
    description: "basic math works",
    verify: verify(async () => {
      await assertThat(2 + 2, is(4));
    }),
  }),
  scenario({
    description: "string concatenation works",
    verify: verify(async () => {
      await assertThat("hello" + " world", is("hello world"));
    }),
  }),
  scenario({
    description: "array operations work",
    verify: verify(async () => {
      const arr = [1, 2, 3];
      await assertThat(arr.length, is(3));
    }),
  }),
];

// Main entry point
export default async () => {
  log("=== Testing runScenarios (basic) ===");
  log("");

  const results = await runScenarios(scenarios, { logger: log });

  const passed = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log("");
  if (failed === 0 && passed === scenarios.length) {
    log("✅ runScenarios basic test: PASSED");
  } else {
    log(`❌ runScenarios basic test: FAILED (${passed} passed, ${failed} failed)`);
  }

  log("");
  log("=== Watch Mode Test ===");
  log("");
  log("Watch mode runs indefinitely and requires the watcher host ops.");
  log("To test manually:");
  log("1. Run: funee funee-lib/validator-watch-demo.ts");
  log("2. Modify files in the watched directory");
  log("3. Observe re-runs");
  log("4. Press Ctrl+C to stop");
  log("");
  log("validator-watch-test complete");
  
  return results;
};
