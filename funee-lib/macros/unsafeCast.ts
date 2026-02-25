/**
 * unsafeCast macro - Type assertion without runtime check
 * 
 * This is a compile-time type cast that produces no runtime code.
 * Use when you're certain about the type but TypeScript can't infer it.
 */

import type { Closure } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * Cast a value to a different type without any runtime check.
 * 
 * The macro simply passes through the expression unchanged,
 * but TypeScript sees it as the target type.
 * 
 * @example
 * ```typescript
 * const value: unknown = fetchSomething();
 * const typed = unsafeCast<string>(value);
 * // typed is now `string` type, but same runtime value
 * ```
 */
export const unsafeCast = createMacro(<T>(input: Closure<any>): Closure<T> => {
  // Just pass through - no transformation needed
  // The type system does the work
  return input as Closure<T>;
}) as <T>(value: any) => T;
