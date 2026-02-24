// Test: Infinite macro recursion detection
// Expected: Should error with "Macro expansion exceeded max iterations"

import { log } from "funee";

const createMacro = (fn: any) => fn;

// This macro calls itself infinitely
const infinite = createMacro((x: any) => {
  return infinite(x);  // Infinite recursion!
});

// This should trigger the max_iterations guard
const result = infinite(5);

export default () => {
  log(`${result}`);
};
