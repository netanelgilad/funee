/**
 * Core assertion type and helpers for the funee testing library.
 * 
 * An Assertion is a function that validates an actual value and throws
 * if the validation fails.
 */

export type Assertion<TActual> = (actual: TActual) => void | Promise<void>;

/**
 * Helper to create type-safe assertions with proper inference.
 */
export const assertion = (cb: Assertion<any>): Assertion<any> => {
  return cb;
};

export type OtherwiseCallback = (
  error: Error
) => string | Promise<string> | void;

export type Otherwise = {
  __tag: "otherwise";
  value: OtherwiseCallback;
};

export const isOtherwise = (arg: any): arg is Otherwise => {
  return !!arg && typeof arg === "object" && arg.__tag === "otherwise";
};

export type Within = {
  __tag: "within";
  ms: number;
};

export const isWithin = (arg: any): arg is Within => {
  return !!arg && typeof arg === "object" && arg.__tag === "within";
};

/**
 * Provide additional context when an assertion fails.
 * 
 * @example
 * await assertThat(
 *   result,
 *   is(expected),
 *   otherwise((err) => `Got ${result} but expected ${expected}`)
 * );
 */
export const otherwise = (cb: OtherwiseCallback): Otherwise => {
  return {
    __tag: "otherwise",
    value: cb,
  };
};

/**
 * Specify a timeout for async assertions.
 * 
 * @example
 * await assertThat(
 *   stream,
 *   willStream("expected output"),
 *   within(5000).milliseconds
 * );
 */
export const within = (value: number) => {
  return {
    milliseconds: { __tag: "within", ms: value } as Within,
  };
};
