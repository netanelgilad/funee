/**
 * definition macro - Capture an expression as a Definition
 * 
 * Similar to closure, but wraps the expression in a variable declaration.
 * This is useful for macros that need to inject new definitions.
 */

import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * Definition type - A declaration paired with its references
 * 
 * Unlike Closure which captures just an expression, Definition
 * captures a full declaration (e.g., `const x = ...`).
 */
export interface Definition {
  /**
   * The AST-like representation of the declaration
   */
  declaration: any;
  
  /**
   * Map of external references used in the declaration
   */
  references: Map<string, CanonicalName>;
}

/**
 * Definition constructor function
 */
export const Definition = (data: {
  declaration: any;
  references: any;
}): Definition => ({
  declaration: data.declaration,
  references: data.references instanceof Map
    ? data.references
    : new Map(Object.entries(data.references || {}))
});

/**
 * The definition macro captures an expression and wraps it in a declaration.
 * 
 * At bundle time:
 *   definition(x => x + 1)
 * 
 * Becomes:
 *   { declaration: { type: "VariableDeclaration", ... }, references: new Map([...]) }
 */
export const definition = createMacro(<T>(nodeClosure: Closure<T>): Closure<Definition> => {
  const code = String(nodeClosure.expression).trim();
  
  // Build the references array entries as code
  const refsEntries = Array.from(nodeClosure.references.entries()).map(
    ([localName, canonicalName]) => 
      `[${JSON.stringify(localName)}, { uri: ${JSON.stringify(canonicalName.uri)}, name: ${JSON.stringify(canonicalName.name)} }]`
  );
  
  const refsCode = refsEntries.length > 0 
    ? `new Map([${refsEntries.join(", ")}])`
    : "new Map()";

  // Return code that creates a Definition object
  // The declaration wraps the expression in a const declaration
  const resultCode = `({ declaration: { type: "VariableDeclaration", kind: "const", name: "anonymous", expression: ${JSON.stringify(code)} }, references: ${refsCode} })`;

  return {
    expression: resultCode,
    references: new Map<string, CanonicalName>(),
  };
});
