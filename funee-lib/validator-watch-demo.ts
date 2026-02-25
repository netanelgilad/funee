/**
 * 🔍 Funee Validator Watch Mode Demo
 * 
 * Demonstrates the watch mode functionality for the validator module.
 * Run this, then modify a file in the watched directory to see re-runs.
 * 
 * Usage:
 *   funee funee-lib/validator-watch-demo.ts
 * 
 * Press Ctrl+C to stop watching.
 */

import {
  scenario,
  runScenariosWatch,
  assertThat,
  is,
  log,
  Closure,
} from "funee";

// Helper to create inline closures
const verify = <T>(fn: T): Closure<T> => ({
  expression: fn,
  references: new Map(),
});

// Define our test scenarios
const scenarios = [
  scenario({
    description: "arithmetic operations work",
    verify: verify(async () => {
      await assertThat(2 + 2, is(4));
      await assertThat(10 * 5, is(50));
    }),
  }),

  scenario({
    description: "strings behave correctly",
    verify: verify(async () => {
      await assertThat("hello".length, is(5));
      await assertThat("abc".toUpperCase(), is("ABC"));
    }),
  }),

  scenario({
    description: "type checks work",
    verify: verify(async () => {
      await assertThat(typeof 42, is("number"));
      await assertThat(typeof "hello", is("string"));
    }),
  }),
];

// Main entry point - runs watch mode
export default async () => {
  log("🔍 Funee Validator Watch Mode Demo");
  log("===================================");
  log("");

  // Watch the funee-lib directory for changes
  await runScenariosWatch(scenarios, {
    logger: log,
    watchPaths: ["funee-lib/"],
    debounceMs: 100,
  });
  
  // This never returns (watch mode runs indefinitely)
};
