import { log } from "funee";
import { closure, Closure } from "./macro-lib.ts";

const add = (a: number, b: number) => a + b;

// closure() is a macro - at bundle time it should:
// 1. NOT evaluate `add` as a runtime value
// 2. Capture `add`'s AST and references as a Closure object
// 3. Return code that constructs the Closure at runtime
const addClosure: Closure<typeof add> = closure(add);

export default function() {
  // At runtime, addClosure should be a Closure object with:
  // - expression: the AST of `(a, b) => a + b`
  // - references: Map of any external refs (empty in this case)
  
  log(`AST type: ${addClosure.expression.type}`);
  log(`Has references: ${addClosure.references.size >= 0}`);
}
