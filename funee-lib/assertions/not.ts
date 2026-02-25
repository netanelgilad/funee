/**
 * Negation wrapper for assertions.
 */

import { assertion, Assertion } from "./Assertion.ts";
import { AssertionError, isAssertionError } from "./AssertionError.ts";

/**
 * Negate an assertion - passes when the inner assertion fails.
 * 
 * @example
 * await assertThat(5, not(is(10)));  // passes
 * await assertThat(5, not(is(5)));   // fails
 */
export const not = (a: Assertion<any>) => {
  return assertion(async (actual: any) => {
    let innerPassed = false;
    try {
      await a(actual);
      // If we get here, the assertion passed - but we expected it to fail
      innerPassed = true;
    } catch (err) {
      if (!isAssertionError(err)) {
        // Non-assertion errors should propagate
        throw err;
      }
      // AssertionError means the inner assertion failed, which is what we want
    }
    
    // Throw after the try/catch so we don't catch our own error
    if (innerPassed) {
      throw AssertionError({
        message: "Expected assertion to fail but it passed",
        actual,
        expected: "assertion to fail",
      });
    }
  });
};
