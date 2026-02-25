import { randomBytes } from "funee";

/**
 * Generate a cryptographically secure random string of the specified length.
 * 
 * Uses the funee runtime's randomBytes host function which provides
 * cryptographically secure random bytes.
 * 
 * @param desiredLength - The desired length of the random string
 * @returns A random hexadecimal string of the specified length
 * 
 * @example
 * ```ts
 * import { cryptoRandomString } from "funee";
 * 
 * const id = cryptoRandomString(16);
 * // => "a1b2c3d4e5f6a7b8"
 * ```
 */
export const cryptoRandomString = (desiredLength: number): string => {
  // randomBytes returns hex string of 2*n chars for n bytes
  // So for a string of desiredLength hex chars, we need ceil(desiredLength/2) bytes
  const bytesNeeded = Math.ceil(desiredLength / 2);
  const hex = randomBytes(bytesNeeded);
  return hex.slice(0, desiredLength);
};
