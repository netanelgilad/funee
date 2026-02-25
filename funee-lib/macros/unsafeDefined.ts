/**
 * unsafeDefined macro - Assert a value is defined without runtime check
 * 
 * This is a compile-time assertion that produces no runtime code change.
 * Use when you're certain a value is not null/undefined but TypeScript can't prove it.
 */

import type { Closure } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * Assert that a value is not null or undefined without any runtime check.
 * 
 * The macro simply passes through the expression unchanged,
 * but TypeScript removes the `null` and `undefined` from the type.
 * 
 * @example
 * ```typescript
 * const value: string | null = maybeGetString();
 * const defined = unsafeDefined(value);
 * // defined is now `string` type (non-nullable)
 * ```
 */
export const unsafeDefined = createMacro(
  <T>(input: Closure<T | null | undefined>): Closure<T> => {
    // Just pass through the expression unchanged
    return {
      expression: String(input.expression),
      references: input.references,
    };
  }
) as <T>(value: T | null | undefined) => T;
