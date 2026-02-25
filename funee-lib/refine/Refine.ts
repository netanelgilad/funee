/**
 * Refine - Type refinement utilities
 *
 * Refine allows creating "branded" or "opaque" types that carry
 * compile-time knowledge tokens without runtime overhead.
 *
 * @example
 * ```typescript
 * // Create a refined string type that's been validated as an email
 * type Email = Refine<string, { ValidatedEmail: null }>;
 *
 * function validateEmail(s: string): s is Email {
 *   return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
 * }
 *
 * // Now TypeScript tracks that this string has been validated
 * const email: Email = ensure(validateEmail, userInput);
 * ```
 */

/**
 * A refined type that carries compile-time knowledge tokens.
 *
 * The Tokens parameter is a record type where keys represent
 * "knowledge" about the value (e.g., validated, sanitized, etc.)
 * and values are always `null`.
 */
export type Refine<Type, Tokens extends { [key: string]: null }> = {
  readonly __opaque__: Tokens;
} & Type;

/**
 * Helper type to define a set of knowledge tokens.
 *
 * @example
 * ```typescript
 * type EmailKnowledge = KeySet<"ValidatedEmail" | "Sanitized">;
 * // Results in: { ValidatedEmail: null; Sanitized: null }
 * ```
 */
export type KeySet<T extends keyof { [key: string]: null }> = {
  [key in T]: null;
};
