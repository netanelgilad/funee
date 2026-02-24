/**
 * Step 2 Test: Macro Argument Capture
 * 
 * This tests that when a macro like closure(add) is encountered:
 * 1. The bundler detects 'closure' is a macro
 * 2. The argument 'add' is captured as a Closure (not evaluated)
 * 3. The Closure contains the expression AST and references
 * 
 * Expected: The bundled code should have captured the argument
 * and the program should run successfully.
 */

import { log } from "funee";

// Simple createMacro stub for testing
// (In real implementation, this will be from funee standard library)
function createMacro<T, R>(fn: (input: T) => R): (value: T) => R {
  throw new Error("Macro not expanded - this should never run!");
}

// Define a macro that captures its argument
const closure = createMacro(<T>(input: T) => {
  // This macro function runs at compile time
  // For now, just return the input as-is
  return input;
});

// Regular function to be captured
const add = (a: number, b: number) => a + b;

// This should capture 'add' as a Closure at bundle time
const addClosure = closure(add);

export default function() {
  // For Step 2, we're just testing that argument capture happens
  // The macro isn't executed yet, so this will fail
  // But the bundler should successfully capture the argument
  log("Step 2: Argument capture test");
  log("addClosure type: " + typeof addClosure);
  
  // If we got here without errors, capture worked!
  log("✓ Macro argument was captured");
}
