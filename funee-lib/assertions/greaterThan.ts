/**
 * Numeric greater than assertion.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a number is greater than the expected value.
 * 
 * @example
 * await assertThat(5, greaterThan(3)); // pass
 * await assertThat(10, greaterThan(10)); // fail
 */
export const greaterThan = (expected: number): Assertion<number> => {
  return (actual: number): void => {
    if (typeof actual !== "number") {
      throw AssertionError({
        message: "Expected a number but got " + typeof actual,
        actual,
        expected: "> " + expected,
        operator: "greaterThan"
      });
    }
    if (!(actual > expected)) {
      throw AssertionError({
        message: "Expected " + actual + " to be greater than " + expected,
        actual,
        expected: "> " + expected,
        operator: "greaterThan"
      });
    }
  };
};
