/**
 * Regex matching assertion.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a string matches the expected regular expression.
 * 
 * @example
 * await assertThat("hello123", matches(/\d+/)); // pass
 * await assertThat("abc", matches(/^[a-z]+$/)); // pass
 */
export const matches = (pattern: RegExp): Assertion<string> => {
  return (actual: string): void => {
    if (typeof actual !== "string") {
      throw AssertionError({
        message: "Expected a string but got " + typeof actual,
        actual,
        expected: pattern.toString(),
        operator: "matches"
      });
    }
    if (!pattern.test(actual)) {
      throw AssertionError({
        message: "Expected " + JSON.stringify(actual) + " to match " + pattern.toString(),
        actual,
        expected: pattern.toString(),
        operator: "matches"
      });
    }
  };
};
