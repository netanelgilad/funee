/**
 * Test fixture demonstrating focused scenarios.
 * 
 * When a scenario has focus: true, only focused scenarios run.
 */
import { 
  log, 
  scenario, 
  runScenarios,
  Closure,
  assertThat, 
  is 
} from "funee";

// Define scenarios with one focused
const scenarios = [
  scenario({
    description: "this should NOT run (not focused)",
    verify: {
      expression: async () => {
        // If this runs, it would pass - but we verify it doesn't run
        log("SHOULD_NOT_SEE_THIS");
        await assertThat(1, is(1));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "this SHOULD run (focused)",
    focus: true,
    verify: {
      expression: async () => {
        log("FOCUSED_SCENARIO_RAN");
        await assertThat(42, is(42));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "another non-focused scenario",
    verify: {
      expression: async () => {
        log("SHOULD_NOT_SEE_THIS_EITHER");
        await assertThat(2, is(2));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  const results = await runScenarios(scenarios, { logger: log });
  
  // Only 1 scenario should have run (the focused one)
  log("Scenarios run: " + results.length);
  
  if (results.length !== 1) {
    throw new Error("Expected only 1 focused scenario to run, got " + results.length);
  }
  
  if (results[0].description !== "this SHOULD run (focused)") {
    throw new Error("Wrong scenario ran: " + results[0].description);
  }
  
  log("Focus test passed!");
};
