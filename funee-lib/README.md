# funee - Standard Library

The funee standard library provides TypeScript types and runtime utilities for working with the funee compile-time macro system.

## Installation

```typescript
// Import from the virtual "funee" module
import { Closure, CanonicalName, createMacro, log } from "funee";
```

**Note:** The funee module is provided by the funee bundler. You don't need to install it via npm/pnpm.

## Quick Start

### Using Host Functions

```typescript
import { log } from "funee";

export default function() {
  log("Hello from funee!");
}
```

### Defining a Macro

```typescript
import { createMacro, Closure, CanonicalName } from "funee";

// Define a compile-time macro
const myMacro = createMacro(<T>(input: Closure<T>): Closure<string> => {
  // This runs at BUNDLE TIME, not runtime
  // Transform the input AST and return a new Closure
  
  return {
    expression: {
      type: "StringLiteral",
      value: `Transformed: ${input.expression.type}`
    },
    references: new Map()
  };
});
```

### Using a Macro

```typescript
import { myMacro } from "./macros.ts";

const result = myMacro(someExpression);  // Transformed at bundle time
```

## API Reference

### Core Types

#### `Closure<T>`

Represents a captured expression with its external references.

```typescript
interface Closure<T> {
  expression: any;  // AST node
  references: Map<string, CanonicalName>;
}
```

**Properties:**
- `expression`: The AST node representing the captured code
- `references`: Map of external references (local name → CanonicalName)

#### `CanonicalName`

Uniquely identifies a definition across the codebase.

```typescript
interface CanonicalName {
  uri: string;   // Module URI
  name: string;  // Export name
}
```

**Example:**
```typescript
const name: CanonicalName = {
  uri: "./utils.ts",
  name: "formatDate"
};
```

### Functions

#### `createMacro<T, R>(fn)`

Marks a function as a compile-time macro.

```typescript
function createMacro<T, R>(
  fn: (closure: Closure<T>) => Closure<R>
): (value: T) => R
```

**Parameters:**
- `fn`: The macro transformation function (runs at bundle time)

**Returns:** A function with the same signature as `T -> R`, but intercepted by the bundler

**Example:**
```typescript
const closure = createMacro(<T>(input: Closure<T>): Closure<Closure<T>> => {
  // Bundle-time transformation
  return {
    expression: /* construct Closure */,
    references: new Map()
  };
});
```

#### `Closure(data)`

Runtime constructor for Closure objects.

```typescript
function Closure<T>(data: {
  expression: any;
  references: any;
}): Closure<T>
```

**Parameters:**
- `data.expression`: The AST node
- `data.references`: References map (can be Map or plain object)

**Returns:** A properly formatted `Closure<T>` object

**Note:** This is used by bundler-generated code, not typically called by users directly.

### Host Functions

#### `log(message)`

Prints a message to the console.

```typescript
function log(message: string): void
```

**Example:**
```typescript
import { log } from "funee";
log("Hello world!");
```

#### `debug(message)`

Prints a debug message with additional context.

```typescript
function debug(message: string): void
```

## How It Works

### Two-Phase Execution

1. **Bundle Time (compile-time)**
   - Macros defined with `createMacro` are detected by the bundler
   - When called, macro functions execute during bundling
   - Arguments are captured as `Closure` objects (AST + references)
   - Macro functions transform AST and return new `Closure` objects
   - Call sites are replaced with transformed code

2. **Runtime (execution-time)**
   - Generated code constructs `Closure` objects using the runtime constructor
   - Host functions like `log` execute via native ops
   - No macro execution happens at runtime

### Example: The `closure` Macro

**Definition:**
```typescript
import { createMacro, Closure } from "funee";

export const closure = createMacro(<T>(input: Closure<T>): Closure<Closure<T>> => {
  // Runs at bundle time
  // Returns AST that constructs the input Closure at runtime
  return {
    expression: /* CallExpr: Closure({ expression: ..., references: ... }) */,
    references: new Map([["Closure", { uri: "funee", name: "Closure" }]])
  };
});
```

**Usage:**
```typescript
import { closure, log } from "funee";

const add = (a: number, b: number) => a + b;
const addClosure = closure(add);  // Transformed at bundle time

export default function() {
  log(`AST type: ${addClosure.expression.type}`);
}
```

**Generated Code:**
```typescript
const add = (a, b) => a + b;
const addClosure = Closure({
  expression: { type: "ArrowFunctionExpression", params: [...], body: {...} },
  references: {}
});

export default function() {
  log(`AST type: ${addClosure.expression.type}`);
}
```

## Module Structure

```
funee-lib/
├── index.ts         # Main entry point (barrel export)
├── core.ts          # Macro system types (Closure, CanonicalName, createMacro)
├── host.ts          # Host function declarations (log, debug)
├── package.json     # Package metadata
├── README.md        # This file
└── FUNEE_LIB_DESIGN.md  # Detailed design document
```

## Documentation

- **API Reference**: See this README
- **Design Document**: See [FUNEE_LIB_DESIGN.md](./FUNEE_LIB_DESIGN.md)
- **Examples**: See `tests/fixtures/macro/` in the funee repository

## Contributing

Contributions are welcome! Please read the design document to understand the architecture before making changes.

### Adding Host Functions

1. Add type declaration in `host.ts`
2. Implement Rust op in `src/` (see existing ops like `op_log`)
3. Register in ExecutionRequest host_functions map
4. Add tests

## License

MIT
