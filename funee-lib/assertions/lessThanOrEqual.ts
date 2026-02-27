/**
 * Numeric less than or equal assertion.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a number is less than or equal to the expected value.
 * 
 * @example
 * await assertThat(5, lessThanOrEqual(5)); // pass
 * await assertThat(4, lessThanOrEqual(5)); // pass
 * await assertThat(6, lessThanOrEqual(5)); // fail
 */
export const lessThanOrEqual = (expected: number): Assertion<number> => {
  return (actual: number): void => {
    if (typeof actual !== "number") {
      throw AssertionError({
        message: "Expected a number but got " + typeof actual,
        actual,
        expected: "<= " + expected,
        operator: "lessThanOrEqual"
      });
    }
    if (!(actual <= expected)) {
      throw AssertionError({
        message: "Expected " + actual + " to be less than or equal to " + expected,
        actual,
        expected: "<= " + expected,
        operator: "lessThanOrEqual"
      });
    }
  };
};
