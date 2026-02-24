// Test: Macro that adds references to the closure
// Expected: withAdd(10) expands to add(10, 5), includes add function, outputs 15

import { log } from "funee";

const createMacro = (fn: any) => fn;
const CanonicalName = (props: { uri: string; name: string }) => props;

// Helper function that will be referenced by the macro
const add = (a: number, b: number) => a + b;

const withAdd = createMacro((x: any) => {
  const refs = new Map(x.references);
  refs.set('add', CanonicalName({ uri: './macro_with_refs.ts', name: 'add' }));
  
  return {
    expression: `add(${x.expression}, 5)`,
    references: refs
  };
});

// This should expand to: add(10, 5)
// And include the 'add' function in the bundle
const result = withAdd(10);

export default () => {
  log(`${result}`);
};
