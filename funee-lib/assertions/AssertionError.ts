/**
 * Custom AssertionError for funee assertions.
 * 
 * Since funee doesn't support class declarations at runtime,
 * we use a factory function pattern.
 */

export interface AssertionErrorOptions {
  message?: string;
  actual?: any;
  expected?: any;
  operator?: string;
}

export interface AssertionErrorType extends Error {
  actual: any;
  expected: any;
  operator: string;
  isAssertionError: boolean;
}

/**
 * Create an AssertionError.
 */
export const AssertionError = (options: AssertionErrorOptions): AssertionErrorType => {
  const msg = options.message || 
    "Expected " + JSON.stringify(options.expected) + " but got " + JSON.stringify(options.actual);
  const err = new Error(msg) as AssertionErrorType;
  err.name = "AssertionError";
  err.actual = options.actual;
  err.expected = options.expected;
  err.operator = options.operator || "strictEqual";
  err.isAssertionError = true;
  return err;
};

/**
 * Check if an error is an AssertionError.
 */
export const isAssertionError = (err: any): err is AssertionErrorType => {
  return !!err && err.isAssertionError === true;
};

/**
 * Assert that a condition is true.
 */
export const assert = (condition: boolean, message?: string) => {
  if (!condition) {
    throw AssertionError({
      message: message || "Assertion failed",
      actual: condition,
      expected: true,
    });
  }
};

/**
 * Assert strict equality (===).
 */
export const strictEqual = (actual: any, expected: any, message?: string) => {
  if (actual !== expected) {
    throw AssertionError({
      message: message || "Expected " + JSON.stringify(expected) + " but got " + JSON.stringify(actual),
      actual,
      expected,
      operator: "strictEqual",
    });
  }
};

/**
 * Assert deep equality for objects/arrays.
 */
export const deepEqual = (actual: any, expected: any, message?: string) => {
  if (!isDeepEqual(actual, expected)) {
    throw AssertionError({
      message: message || "Expected deep equality",
      actual,
      expected,
      operator: "deepEqual",
    });
  }
};

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
