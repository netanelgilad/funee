/**
 * Refine - Type refinement utilities for funee
 *
 * This module provides type-safe refinement patterns using TypeScript's
 * type system. Refined types carry compile-time "knowledge tokens" that
 * track validations and transformations applied to values.
 *
 * @example
 * ```typescript
 * import { Refine, KeySet, ensure, encode } from "funee";
 *
 * // Define a refined type for validated emails
 * type ValidEmail = Refine<string, { EmailValidated: null }>;
 *
 * // Create a type guard
 * function isValidEmail(s: string): s is ValidEmail {
 *   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
 * }
 *
 * // Use ensure for assertion-style refinement
 * function sendEmail(email: string) {
 *   ensure(isValidEmail, email);
 *   // email is now ValidEmail
 * }
 *
 * // Use encode for expression-style refinement
 * const validatedEmail = encode(isValidEmail, userInput);
 * ```
 */

export { Refine, KeySet } from "./Refine.ts";
export { ensure } from "./ensure.ts";
export { encode } from "./encode.ts";
