/**
 * Test: The closure macro captures an expression as Closure<Closure<T>>
 */

import { closure, Closure, log } from "funee";

// Use the closure macro to capture an expression
const addClosure = closure((a: number, b: number) => a + b);

// At runtime, addClosure should be a Closure containing the AST
export default function() {
  log(`type: ${typeof addClosure}`);  // "object"
  log(`expr type: ${typeof addClosure.expression}`);  // "object" (the AST)
  log(`AST type: ${addClosure.expression.type}`);  // "ArrowFunctionExpression"
}
