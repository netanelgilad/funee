/**
 * Equality assertion using strict equality (===).
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Assert that a value is strictly equal to the expected value.
 * 
 * @example
 * await assertThat(2 + 2, is(4));
 * await assertThat(result, is("hello"));
 */
export const is = (expectedValue: any): Assertion<any> => {
  return (actualValue: any): void => {
    if (actualValue !== expectedValue) {
      throw AssertionError({
        message: "Expected " + JSON.stringify(expectedValue) + " but got " + JSON.stringify(actualValue),
        actual: actualValue,
        expected: expectedValue,
        operator: "strictEqual"
      });
    }
  };
};
