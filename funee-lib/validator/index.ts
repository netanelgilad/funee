/**
 * funee validator - Test scenario execution for funee applications.
 * 
 * The validator module provides a simple testing framework built on
 * the funee assertion library. It supports:
 * - Scenario definitions with descriptions
 * - Focus mode for running specific scenarios
 * - Concurrent execution
 * - Clear pass/fail reporting
 * 
 * @example
 * import { scenario, runScenarios, closure, assertThat, is } from "funee";
 * 
 * const scenarios = [
 *   scenario({
 *     description: "addition works",
 *     verify: closure(() => async () => {
 *       await assertThat(2 + 2, is(4));
 *     }),
 *   }),
 *   scenario({
 *     description: "strings concatenate",
 *     verify: closure(() => async () => {
 *       await assertThat("hello" + " world", is("hello world"));
 *     }),
 *   }),
 * ];
 * 
 * await runScenarios(scenarios);
 */

export type { Scenario } from "./scenario.ts";
export { scenario } from "./scenario.ts";

export type { ScenarioResult, RunScenariosOptions, ScenarioLogger } from "./runScenarios.ts";
export { runScenarios } from "./runScenarios.ts";
