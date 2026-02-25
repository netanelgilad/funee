/**
 * canonicalName macro - Get the CanonicalName for a reference
 * 
 * This macro looks up a reference in the closure's references map
 * and returns code that constructs the CanonicalName at runtime.
 */

import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * Implementation of the canonicalName macro
 * 
 * @param node - Closure containing a single identifier
 * @returns Closure that constructs the CanonicalName at runtime
 */
export const canonicalNameFn = (node: Closure<any>): Closure<CanonicalName> => {
  // The expression should be an identifier (a variable name as string)
  const reference = String(node.expression).trim();
  
  // Look up the canonical name from references
  const referenceCanonicalName = node.references.get(reference);
  
  if (!referenceCanonicalName) {
    throw new Error(
      `canonicalName: reference "${reference}" not found in closure references. ` +
      `Available: [${Array.from(node.references.keys()).join(", ")}]`
    );
  }
  
  // Return code that creates a plain object with uri and name
  const resultCode = `({ uri: ${JSON.stringify(referenceCanonicalName.uri)}, name: ${JSON.stringify(referenceCanonicalName.name)} })`;

  return {
    expression: resultCode,
    references: new Map(),
  };
};

/**
 * Get the canonical name (module URI + export name) for a reference.
 * 
 * @example
 * ```typescript
 * import { someFunction } from "./utils.ts";
 * 
 * const name = canonicalName(someFunction);
 * // name === { uri: "./utils.ts", name: "someFunction" }
 * ```
 */
export const canonicalName = createMacro(canonicalNameFn);
