/**
 * closure macro - Capture an expression as Closure<Closure<T>>
 * 
 * This is the core macro that enables runtime access to AST.
 * It captures an expression and returns code that constructs
 * a Closure object at runtime containing the expression's AST.
 */

import type { Closure, CanonicalName } from "../core.ts";
import { createMacro } from "../core.ts";

/**
 * The closure macro captures an expression and returns its AST at runtime.
 * 
 * At bundle time:
 *   closure(x => x + 1)
 * 
 * Becomes:
 *   Closure({
 *     expression: { type: "ArrowFunctionExpression", code: "(x) => x + 1" },
 *     references: new Map([...])
 *   })
 */
export const closure = createMacro(<T>(nodeClosure: Closure<T>): Closure<Closure<T>> => {
  // nodeClosure.expression is a CODE STRING like "(a, b) => a + b"
  // We need to determine the AST type from the code
  const code = String(nodeClosure.expression).trim();
  
  // Infer the expression type from the code
  let exprType = "Expression";
  if (code.includes("=>")) {
    exprType = "ArrowFunctionExpression";
  } else if (code.startsWith("function")) {
    exprType = "FunctionExpression";
  } else if (code.startsWith("(") && code.includes("=>")) {
    exprType = "ArrowFunctionExpression";
  } else if (code.startsWith("{")) {
    exprType = "ObjectExpression";
  } else if (code.startsWith("[")) {
    exprType = "ArrayExpression";
  } else if (/^[\d.]/.test(code)) {
    exprType = "NumericLiteral";
  } else if (code.startsWith('"') || code.startsWith("'") || code.startsWith("`")) {
    exprType = "StringLiteral";
  } else if (code === "true" || code === "false") {
    exprType = "BooleanLiteral";
  } else if (code === "null") {
    exprType = "NullLiteral";
  } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(code)) {
    exprType = "Identifier";
  }

  // Build the references array entries as code
  const refsEntries = Array.from(nodeClosure.references.entries()).map(
    ([localName, canonicalName]) => 
      `[${JSON.stringify(localName)}, { uri: ${JSON.stringify(canonicalName.uri)}, name: ${JSON.stringify(canonicalName.name)} }]`
  );
  
  const refsCode = refsEntries.length > 0 
    ? `new Map([${refsEntries.join(", ")}])`
    : "new Map()";

  // Build: ({ expression: { type, code }, references: ... })
  // Return a plain object - no Closure wrapper needed
  // The expression is an AST-like object with type and the original code
  const resultCode = `({ expression: { type: ${JSON.stringify(exprType)}, code: ${JSON.stringify(code)} }, references: ${refsCode} })`;

  return {
    expression: resultCode,
    references: new Map<string, CanonicalName>(),  // No external references needed
  };
});
