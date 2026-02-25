/**
 * Basic validator scenario test fixture.
 * 
 * Demonstrates the scenario/runScenarios pattern with simple assertions.
 */
import { 
  log, 
  scenario, 
  runScenarios,
  Closure,
  assertThat, 
  is 
} from "funee";

// Define test scenarios
const scenarios = [
  scenario({
    description: "addition works correctly",
    verify: {
      expression: async () => {
        await assertThat(2 + 2, is(4));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "string concatenation works",
    verify: {
      expression: async () => {
        await assertThat("hello" + " world", is("hello world"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  const results = await runScenarios(scenarios, { logger: log });
  
  // Check that all passed
  const allPassed = results.every(r => r.success);
  log("All scenarios passed: " + allPassed);
  
  if (!allPassed) {
    throw new Error("Some scenarios failed");
  }
};
