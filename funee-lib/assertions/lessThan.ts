/**
 * Numeric less than assertion.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a number is less than the expected value.
 * 
 * @example
 * await assertThat(2, lessThan(10)); // pass
 * await assertThat(10, lessThan(10)); // fail
 */
export const lessThan = (expected: number): Assertion<number> => {
  return (actual: number): void => {
    if (typeof actual !== "number") {
      throw AssertionError({
        message: "Expected a number but got " + typeof actual,
        actual,
        expected: "< " + expected,
        operator: "lessThan"
      });
    }
    if (!(actual < expected)) {
      throw AssertionError({
        message: "Expected " + actual + " to be less than " + expected,
        actual,
        expected: "< " + expected,
        operator: "lessThan"
      });
    }
  };
};
