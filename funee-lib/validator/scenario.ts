/**
 * Scenario - Test scenario definition for funee applications.
 * 
 * A Scenario represents a single test case with a description and
 * an async verify function. Scenarios can be focused to run only
 * a subset during development.
 * 
 * @example
 * import { scenario, Closure, closure, assertThat, is } from "funee";
 * 
 * const myScenario = scenario({
 *   description: "addition works correctly",
 *   verify: closure(() => async () => {
 *     await assertThat(2 + 2, is(4));
 *   }),
 * });
 * 
 * // Focus a scenario during development
 * const focusedScenario = scenario({
 *   description: "only this one runs",
 *   focus: true,
 *   verify: closure(() => async () => {
 *     // ...
 *   }),
 * });
 */

import type { Closure } from "../core.ts";

/**
 * A test scenario with a description and verification function.
 */
export type Scenario = {
  /** Human-readable description of what this scenario tests */
  description: string;
  /** When true, only focused scenarios run (for development) */
  focus?: true;
  /** The async function that verifies the scenario */
  verify: Closure<() => Promise<unknown>>;
};

/**
 * Factory function to create a Scenario with type inference.
 * 
 * @param x - The scenario definition
 * @returns The same scenario (identity function for type inference)
 */
export const scenario = (x: Scenario): Scenario => x;
