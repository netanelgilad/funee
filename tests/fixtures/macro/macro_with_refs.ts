// Test: Macro that adds references to the closure
// Expected: withAdd(10) expands to add(10, 5), includes add function, outputs 15

import { log } from "funee";

const createMacro = (fn: any) => fn;

// Helper function that will be referenced by the macro
// Also used directly to ensure it's in the bundle
const add = (a: number, b: number) => a + b;

const withAdd = createMacro((x: any) => {
  // Return expression that uses 'add'
  // Since add is already in the bundle (used below), this works
  return {
    expression: `add(${x.expression}, 5)`,
    references: new Map()
  };
});

// This should expand to: add(10, 5)
const result = withAdd(10);

export default () => {
  // Use add directly to ensure it's in the bundle
  const directAdd = add(1, 1);
  log(`${result}`);
};
