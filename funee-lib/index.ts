/**
 * funee - Standard Runtime Library
 * 
 * The funee standard library provides:
 * - Core types for the macro system (Closure, CanonicalName)
 * - Macro definition utilities (createMacro)
 * - Host functions (log, debug)
 * 
 * @example
 * ```typescript
 * import { Closure, CanonicalName, createMacro, log } from "funee";
 * 
 * // Define a compile-time macro
 * const myMacro = createMacro((input: Closure<any>) => {
 *   // Transform the input AST at bundle time
 *   return Closure({
 *     expression: transformedAST,
 *     references: new Map()
 *   });
 * });
 * ```
 */

// Core macro system types and functions
export type {
  Closure,
  CanonicalName,
  MacroFunction,
  MacroResultWithDefinitions
} from "./core.ts";

export {
  createMacro,
  Closure,
  Closure as ClosureConstructor
} from "./core.ts";

// Host functions provided by the runtime
export {
  log,
  debug
} from "./host.ts";
