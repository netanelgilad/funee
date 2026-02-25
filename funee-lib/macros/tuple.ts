/**
 * tuple macro - Combine multiple closures into an array
 * 
 * This macro takes multiple captured expressions and returns
 * a single closure containing an array of their expressions.
 */

import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * Combines multiple closures into a single closure containing an array.
 * 
 * At bundle time:
 *   tuple(a, b, c)
 * 
 * Becomes:
 *   [aExpr, bExpr, cExpr]
 * 
 * With merged references from all inputs.
 * 
 * @example
 * ```typescript
 * const [addClosure, subClosure] = tuple(
 *   (a, b) => a + b,
 *   (a, b) => a - b
 * );
 * ```
 */
export const tuple = createMacro((...args: Closure<any>[]): Closure<any[]> => {
  // Combine all expressions into an array
  const elements = args.map(arg => String(arg.expression));
  const resultCode = `[${elements.join(", ")}]`;
  
  // Merge all references from all arguments
  const mergedReferences = new Map<string, CanonicalName>();
  for (const arg of args) {
    for (const [key, value] of arg.references) {
      mergedReferences.set(key, value);
    }
  }
  
  return {
    expression: resultCode,
    references: mergedReferences,
  };
}) as <T extends any[]>(...args: { [K in keyof T]: T[K] }) => T;
