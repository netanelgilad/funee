// Closure type - represents captured AST + references
export interface Closure<T> {
  expression: any;  // The AST node or simple representation
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
  // input.expression is the CODE STRING of the captured expression
  
  // Determine expression type from the code
  const expr = input.expression.trim();
  let exprType = "Expression";
  if (expr.includes("=>")) exprType = "ArrowFunctionExpression";
  else if (expr.startsWith("function")) exprType = "FunctionExpression";
  
  // Return code that constructs a Closure at runtime
  // Inline the object construction to avoid needing Closure function
  return {
    expression: `({ expression: { type: "${exprType}" }, references: new Map() })`,
    references: new Map()  // No external references needed
  };
});

// Runtime Closure constructor (used by emitted code if needed)
export function Closure<T>(data: { expression: any; references: any }): Closure<T> {
  return {
    expression: data.expression,
    references: data.references instanceof Map ? data.references : new Map(Object.entries(data.references || {}))
  };
}
