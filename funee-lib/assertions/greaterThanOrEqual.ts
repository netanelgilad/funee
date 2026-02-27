/**
 * Numeric greater than or equal assertion.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a number is greater than or equal to the expected value.
 * 
 * @example
 * await assertThat(5, greaterThanOrEqual(5)); // pass
 * await assertThat(6, greaterThanOrEqual(5)); // pass
 * await assertThat(4, greaterThanOrEqual(5)); // fail
 */
export const greaterThanOrEqual = (expected: number): Assertion<number> => {
  return (actual: number): void => {
    if (typeof actual !== "number") {
      throw AssertionError({
        message: "Expected a number but got " + typeof actual,
        actual,
        expected: ">= " + expected,
        operator: "greaterThanOrEqual"
      });
    }
    if (!(actual >= expected)) {
      throw AssertionError({
        message: "Expected " + actual + " to be greater than or equal to " + expected,
        actual,
        expected: ">= " + expected,
        operator: "greaterThanOrEqual"
      });
    }
  };
};
