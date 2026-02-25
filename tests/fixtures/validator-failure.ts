/**
 * Test fixture demonstrating scenario failure handling.
 * 
 * Tests that failed scenarios are properly tracked and reported.
 */
import { 
  log, 
  scenario, 
  runScenarios,
  Closure,
  assertThat, 
  is 
} from "funee";

// Define scenarios with one that fails
const scenarios = [
  scenario({
    description: "this passes",
    verify: {
      expression: async () => {
        await assertThat(1 + 1, is(2));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "this fails intentionally",
    verify: {
      expression: async () => {
        await assertThat(1 + 1, is(3)); // Will fail
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "this also passes",
    verify: {
      expression: async () => {
        await assertThat("a", is("a"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  const results = await runScenarios(scenarios, { logger: log });
  
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  log("Passed: " + passed);
  log("Failed: " + failed);
  
  // We expect 2 passed, 1 failed
  if (passed !== 2 || failed !== 1) {
    throw new Error("Expected 2 passed and 1 failed, got " + passed + " passed and " + failed + " failed");
  }
  
  // Check that the right one failed
  const failedScenario = results.find(r => !r.success);
  if (failedScenario && failedScenario.description !== "this fails intentionally") {
    throw new Error("Wrong scenario failed: " + failedScenario.description);
  }
  
  log("Failure handling test passed!");
};
