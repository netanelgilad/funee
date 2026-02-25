/**
 * canonicalName macro - Get the CanonicalName for a reference
 * 
 * This macro looks up a reference in the closure's references map
 * and returns code that constructs the CanonicalName at runtime.
 */

import {
  objectExpression,
  objectProperty,
  identifier,
  stringLiteral,
} from "../ast-types.ts";
import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";
import { isIdentifier, Identifier } from "../ast-types.ts";

/**
 * Implementation of the canonicalName macro
 * 
 * @param node - Closure containing a single identifier
 * @returns Closure that constructs the CanonicalName at runtime
 */
export const canonicalNameFn = (node: Closure<any>): Closure<CanonicalName> => {
  // The expression must be an identifier
  const expr = node.expression;
  
  if (!isIdentifier(expr)) {
    throw new Error(
      `canonicalName macro expects an identifier, got: ${expr?.type || typeof expr}`
    );
  }
  
  // Get the identifier's name (SWC uses 'value', Babel uses 'name')
  const reference = (expr as Identifier).value || (expr as any).name;
  
  if (!reference) {
    throw new Error("canonicalName: could not extract identifier name");
  }
  
  // Look up the canonical name from references
  const referenceCanonicalName = node.references.get(reference);
  
  if (!referenceCanonicalName) {
    throw new Error(
      `canonicalName: reference "${reference}" not found in closure references. ` +
      `Available: [${Array.from(node.references.keys()).join(", ")}]`
    );
  }
  
  // Build: { uri: "...", name: "..." }
  const canonicalNameObject = objectExpression([
    objectProperty(identifier("uri"), stringLiteral(referenceCanonicalName.uri)),
    objectProperty(identifier("name"), stringLiteral(referenceCanonicalName.name)),
  ]);

  return {
    expression: canonicalNameObject,
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
