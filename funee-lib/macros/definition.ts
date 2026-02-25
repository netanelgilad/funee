/**
 * definition macro - Capture an expression as a Definition
 * 
 * Similar to closure, but wraps the expression in a variable declaration.
 * This is useful for macros that need to inject new definitions.
 */

import {
  arrayExpression,
  callExpression,
  identifier,
  objectExpression,
  objectProperty,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from "../ast-types.ts";
import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";
import { toAST } from "./toAST.ts";

/**
 * Definition type - A declaration paired with its references
 * 
 * Unlike Closure which captures just an expression, Definition
 * captures a full declaration (e.g., `const x = ...`).
 */
export interface Definition {
  /**
   * The AST of the declaration (typically a VariableDeclaration)
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
 *   Definition({
 *     declaration: { type: "VariableDeclaration", declarations: [...] },
 *     references: new Map([...])
 *   })
 * 
 * @template T - The type of the captured expression
 */
export const definition = createMacro(<T>(nodeClosure: Closure<T>): Closure<Definition> => {
  // Wrap the expression in: const anonymous = <expression>
  const declaration = variableDeclaration("const", [
    variableDeclarator(
      identifier("anonymous"),
      nodeClosure.expression
    ),
  ]);
  
  // Build the references array: [["name", {...}], ...]
  const referencesArray = Array.from(nodeClosure.references.entries()).map(
    ([localName, canonicalName]) => {
      return arrayExpression([
        stringLiteral(localName),
        objectExpression([
          objectProperty(identifier("uri"), stringLiteral(canonicalName.uri)),
          objectProperty(identifier("name"), stringLiteral(canonicalName.name)),
        ]),
      ]);
    }
  );

  // Build: Definition({ declaration: ..., references: new Map([...]) })
  const definitionCall = callExpression(identifier("Definition"), [
    objectExpression([
      objectProperty(identifier("declaration"), toAST(declaration)),
      objectProperty(
        identifier("references"),
        callExpression(
          identifier("Map"),
          referencesArray.length > 0
            ? [arrayExpression(referencesArray)]
            : []
        )
      ),
    ]),
  ]);

  return {
    expression: definitionCall,
    references: new Map<string, CanonicalName>([
      ["Definition", { uri: "funee", name: "Definition" }],
    ]),
  };
});
