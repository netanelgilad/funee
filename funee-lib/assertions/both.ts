/**
 * Combine multiple assertions.
 */

import { assertion, Assertion } from "./Assertion.ts";

/**
 * Combine two assertions - both must pass.
 * 
 * @example
 * await assertThat(5, both(isNumber, isPositive));
 */
export const both = (a: Assertion<any>, b: Assertion<any>) => {
  return assertion(async (actual: any) => {
    await a(actual);
    await b(actual);
  });
};
