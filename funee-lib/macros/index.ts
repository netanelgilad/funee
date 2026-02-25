/**
 * funee macros - Compile-time code transformation
 * 
 * These macros run at bundle time to transform code.
 * They enable runtime access to AST and other metaprogramming patterns.
 */

// Core macro - captures expression as Closure
export { closure } from "./closure.ts";

// Definition macro - captures as Definition (declaration + references)
export { definition, Definition } from "./definition.ts";

// Utility macros
export { canonicalName, canonicalNameFn } from "./canonicalName.ts";
export { tuple } from "./tuple.ts";
export { unsafeCast } from "./unsafeCast.ts";
export { unsafeDefined } from "./unsafeDefined.ts";

// Helper function used by macros
export { toAST } from "./toAST.ts";
