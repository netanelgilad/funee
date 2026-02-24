// Test: Macro calling another macro (recursive expansion)
// Expected: addTwo(5) -> double(addOne(5)) -> ((5) + 1) * 2 -> 12

import { log } from "funee";

const createMacro = (fn: any) => fn;

const addOne = createMacro((x: any) => ({
  expression: `(${x.expression}) + 1`,
  references: x.references
}));

const double = createMacro((x: any) => ({
  expression: `(${x.expression}) * 2`,
  references: x.references
}));

// This macro calls other macros!
// Requires iterative expansion
const addTwo = createMacro((x: any) => {
  return double(addOne(x));
});

// Should expand over multiple iterations:
// 1. addTwo(5) -> double(addOne(5))
// 2. addOne(5) -> (5) + 1
// 3. double((5) + 1) -> ((5) + 1) * 2
// Result: 12
const result = addTwo(5);

export default () => {
  log(`${result}`);
};
