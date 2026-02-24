// Test: Simple macro that adds 1 to an expression
// Expected: addOne(5) expands to (5) + 1, outputs 6

import { log } from "funee";

// This will be provided by @opah/core in the future
// For now, we'll implement a minimal version
const createMacro = (fn: any) => fn;

const addOne = createMacro((x: any) => {
  return {
    expression: `(${x.expression}) + 1`,
    references: x.references
  };
});

// This macro call should be expanded at bundle time
// addOne(5) -> (5) + 1
const result = addOne(5);

export default () => {
  log(`${result}`);
};
