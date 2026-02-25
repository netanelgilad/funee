/**
 * Encodes a value through a refinement validator.
 *
 * Returns the value as-is at runtime. This function exists for TypeScript's
 * type system to cast the value to the refined type.
 *
 * @param _validator - Type guard function (unused at runtime)
 * @param value - The value to encode
 * @returns The value (typed as the refined type in TypeScript)
 *
 * @example
 * ```typescript
 * import type { Refine, KeySet } from "funee";
 * import { encode } from "funee";
 * 
 * type NonEmptyString = Refine<string, { NonEmpty: null }>;
 *
 * function isNonEmpty(s: string): s is NonEmptyString {
 *   return s.length > 0;
 * }
 *
 * const validated = encode(isNonEmpty, userInput);
 * // validated is typed as NonEmptyString
 * ```
 */
export const encode = (_validator: any, value: any): any => value;
