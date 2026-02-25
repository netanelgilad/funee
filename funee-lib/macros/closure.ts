/**
 * closure macro - Capture an expression as Closure<Closure<T>>
 * 
 * This is the core macro that enables runtime access to AST.
 * It captures an expression and returns code that constructs
 * a Closure object at runtime containing the expression's AST.
 */

import {
  arrayExpression,
  callExpression,
  identifier,
  objectExpression,
  objectProperty,
  stringLiteral,
} from "../ast-types.ts";
import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";
import { toAST } from "./toAST.ts";

/**
 * The closure macro captures an expression and returns its AST at runtime.
 * 
 * At bundle time:
 *   closure(x => x + 1)
 * 
 * Becomes:
 *   Closure({
 *     expression: { type: "ArrowFunctionExpression", ... },
 *     references: new Map([...])
 *   })
 * 
 * @template T - The type of the captured expression
 * @param nodeClosure - The captured expression (provided by the bundler)
 * @returns A Closure that constructs the input closure at runtime
 */
export const closure = createMacro(<T>(nodeClosure: Closure<T>): Closure<Closure<T>> => {
  // Build the references array: [["name", CanonicalName({...})], ...]
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

  // Build: Closure({ expression: ..., references: new Map([...]) })
  const closureCall = callExpression(identifier("Closure"), [
    objectExpression([
      objectProperty(identifier("expression"), toAST(nodeClosure.expression)),
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
    expression: closureCall,
    references: new Map<string, CanonicalName>([
      // Closure needs to be imported from funee
      // Map is a global (native JS), no import needed
      ["Closure", { uri: "funee", name: "Closure" }],
    ]),
  };
});
