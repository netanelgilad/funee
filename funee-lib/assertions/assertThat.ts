/**
 * Main assertion function for the funee testing library.
 */

import { Assertion, Otherwise, isOtherwise } from "./Assertion.ts";

/**
 * Check if a value is a Promise.
 */
const isPromise = (value: any): value is Promise<any> => {
  return !!value && typeof value === "object" && typeof value.then === "function";
};

/**
 * Assert that a value matches an assertion.
 * 
 * @example
 * // Basic usage
 * await assertThat(2 + 2, is(4));
 * 
 * // With additional error context
 * await assertThat(result, is(expected), otherwise((err) => `Context: ${context}`));
 * 
 * @param value - The actual value to test
 * @param assertion - The assertion to apply
 * @param handler - Optional callback for additional error context
 */
export const assertThat = async (value: any, assertion: Assertion<any>, handler?: Otherwise): Promise<void> => {
  try {
    await new Promise<void>((resolve, reject) => {
      try {
        const result = assertion(value);
        if (isPromise(result)) {
          result.then(() => resolve()).catch(reject);
        } else {
          resolve();
        }
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    if (handler && isOtherwise(handler)) {
      const moreInfo = await handler.value(err as Error);
      if (moreInfo) {
        (err as Error).message += "\n\nMore Information provided:\n" + moreInfo;
      }
      throw err;
    } else {
      throw err;
    }
  }
};
