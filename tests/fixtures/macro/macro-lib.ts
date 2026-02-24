// Closure type - represents captured AST + references
export interface Closure<T> {
  expression: any;  // The AST node
  references: Map<string, CanonicalName>;
}

export interface CanonicalName {
  uri: string;
  name: string;
}

// createMacro marks a function as a compile-time macro
// The bundler should detect this and handle calls specially
export function createMacro<T, R>(
  fn: (closure: Closure<T>) => Closure<R>
): (value: T) => R {
  // This implementation is never actually called at runtime
  // The bundler intercepts calls to macro-marked functions
  throw new Error("Macro not expanded - bundler should have handled this");
}

// The `closure` macro - captures any expression as a Closure
export const closure = createMacro(<T>(input: Closure<T>): Closure<Closure<T>> => {
  // This runs at BUNDLE TIME, not runtime
  // `input` is already a Closure (the bundler captured the argument's AST)
  
  // We return a Closure that, when emitted, constructs the input Closure
  return {
    expression: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "Closure" },
      arguments: [/* AST to construct input */]
    },
    references: new Map([
      ["Closure", { uri: "./macro-lib.ts", name: "Closure" }]
    ])
  };
});

// Runtime Closure constructor (used by emitted code)
export function Closure<T>(data: { expression: any; references: any }): Closure<T> {
  return {
    expression: data.expression,
    references: data.references instanceof Map ? data.references : new Map(Object.entries(data.references || {}))
  };
}
