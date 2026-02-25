import { cryptoRandomString } from "../random/index.ts";

/**
 * Generate a random string.
 * 
 * Useful for testing or generating unique identifiers.
 * 
 * @param length - The length of the string (default: 16)
 * @returns A random hexadecimal string
 * 
 * @example
 * ```typescript
 * import { someString } from "funee";
 * 
 * const str = someString();
 * // => "a1b2c3d4e5f6a7b8"
 * 
 * const shortStr = someString(8);
 * // => "a1b2c3d4"
 * ```
 */
export const someString = (length: number = 16): string => {
  return cryptoRandomString(length);
};
