/**
 * Containment assertion for strings and arrays.
 */

import { Assertion } from "./Assertion.ts";
import { AssertionError } from "./AssertionError.ts";

/**
 * Deep equality check for containment comparison.
 */
const isDeepEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    
    if (aKeys.length !== bKeys.length) return false;
    
    for (const key of aKeys) {
      if (!isDeepEqual(a[key], b[key])) {
        return false;
      }
    }
    return true;
  }
  
  return false;
};

/**
 * Assert that a value contains the expected item.
 * 
 * For strings: checks if the string contains the expected substring.
 * For arrays: checks if the array contains the expected item (using deep equality for objects).
 * 
 * @example
 * await assertThat("hello world", contains("world")); // pass
 * await assertThat([1, 2, 3], contains(2)); // pass
 * await assertThat([{a: 1}, {b: 2}], contains({a: 1})); // pass (deep equality)
 */
export const contains = (expected: any): Assertion<string | any[]> => {
  return (actual: string | any[]): void => {
    if (typeof actual === "string") {
      if (typeof expected !== "string") {
        throw AssertionError({
          message: "Expected string to contain a string, but got " + typeof expected,
          actual,
          expected,
          operator: "contains"
        });
      }
      if (!actual.includes(expected)) {
        throw AssertionError({
          message: "Expected string to contain " + JSON.stringify(expected) + " but got " + JSON.stringify(actual),
          actual,
          expected,
          operator: "contains"
        });
      }
    } else if (Array.isArray(actual)) {
      const found = actual.some((item) => isDeepEqual(item, expected));
      if (!found) {
        throw AssertionError({
          message: "Expected array to contain " + JSON.stringify(expected) + " but got " + JSON.stringify(actual),
          actual,
          expected,
          operator: "contains"
        });
      }
    } else {
      throw AssertionError({
        message: "Expected string or array but got " + typeof actual,
        actual,
        expected,
        operator: "contains"
      });
    }
  };
};
