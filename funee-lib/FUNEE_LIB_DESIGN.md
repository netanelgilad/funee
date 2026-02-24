# Funee Standard Library - Design Document

## Overview

The funee standard library provides TypeScript types and runtime utilities for the funee macro system. It serves as the interface between user code and the funee bundler's compile-time transformation capabilities.

## Architecture

### Two-Layer Design

The funee library operates at **two distinct execution phases**:

1. **Bundle Time** (compile-time)
   - Macros defined with `createMacro` execute during bundling
   - The bundler intercepts macro calls and runs transformation functions
   - AST manipulation happens in Rust using SWC
   - Macro functions receive and return `Closure` objects

2. **Runtime** (execution-time)
   - Generated code constructs `Closure` objects using the runtime constructor
   - Host functions like `log` and `debug` execute via native ops
   - No macro execution happens at runtime

### Module Structure

```
funee-lib/
├── index.ts         # Barrel export, main entry point
├── core.ts          # Macro system types (Closure, CanonicalName, createMacro)
├── host.ts          # Host function declarations (log, debug)
└── FUNEE_LIB_DESIGN.md  # This file
```

### Import Model

Users import from the virtual module `"funee"`:

```typescript
import { Closure, CanonicalName, createMacro, log } from "funee";
```

The bundler recognizes `"funee"` as a special module and:
- Provides type definitions from `funee-lib/`
- Links host functions to native implementations
- Detects and processes `createMacro` calls

---

## Core Types

### `Closure<T>`

Represents a captured expression with its external references.

**Structure:**
```typescript
interface Closure<T> {
  expression: any;  // AST node
  references: Map<string, CanonicalName>;
}
```

**Bundle-time use:** Macro functions receive and return Closures containing live AST nodes.

**Runtime use:** The `Closure()` constructor builds Closure objects from serialized data.

**Example:**
```typescript
const add = (a: number, b: number) => a + b;
const addClosure: Closure<typeof add> = closure(add);

// At runtime, addClosure = {
//   expression: { type: "ArrowFunctionExpression", ... },
//   references: Map()
// }
```

### `CanonicalName`

Uniquely identifies a definition across the codebase.

**Structure:**
```typescript
interface CanonicalName {
  uri: string;   // Module URI ("./math.ts", "https://...", "@pkg/mod")
  name: string;  // Export name ("add", "default")
}
```

**Purpose:** Enables the bundler to track references across module boundaries and resolve name conflicts.

**Example:**
```typescript
const name: CanonicalName = {
  uri: "https://example.com/utils.ts",
  name: "formatDate"
};
```

### `createMacro<T, R>`

Marks a function as a compile-time macro.

**Signature:**
```typescript
function createMacro<T, R>(
  fn: (closure: Closure<T>) => Closure<R>
): (value: T) => R
```

**Bundle-time behavior:**
- The bundler detects variables initialized with `createMacro(...)`
- Marks them as macro definitions
- When called, executes the macro function at bundle time
- Replaces call sites with transformed AST

**Runtime behavior:**
- Should never execute
- Throws an error if somehow called (indicates bundler bug)

**Example:**
```typescript
const closure = createMacro(<T>(input: Closure<T>): Closure<Closure<T>> => {
  // This runs at BUNDLE TIME
  return {
    expression: /* construct Closure creation AST */,
    references: new Map([["Closure", { uri: "funee", name: "Closure" }]])
  };
});
```

---

## Host Functions

Host functions are implemented in native code (Rust) and exposed as JavaScript functions.

### Current Host Functions

#### `log(message: string): void`

Prints a message to the console.

**Implementation:** Rust op `op_log` in deno_core runtime

**Usage:**
```typescript
import { log } from "funee";
log("Hello world");
```

#### `debug(message: string): void`

Prints a debug message (may include additional context).

**Implementation:** Rust op `op_debug` (to be implemented)

### Adding New Host Functions

To add a new host function:

1. **Add type declaration** in `host.ts`:
   ```typescript
   export declare function myHostFn(arg: string): number;
   ```

2. **Implement Rust op** in `src/execution_request/tests.rs` (or dedicated file):
   ```rust
   #[op2]
   #[string]
   fn op_my_host_fn(#[string] arg: &str) -> u32 {
       // Implementation
   }
   ```

3. **Register op** in ExecutionRequest creation:
   ```rust
   host_functions.insert(
       FuneeIdentifier {
           uri: "funee".to_string(),
           name: "myHostFn".to_string(),
       },
       op_my_host_fn()
   );
   ```

4. **Document** in host.ts with JSDoc comments

---

## Integration with Bundler

### Bundle-Time Flow

1. **Graph Construction**
   - Bundler builds dependency graph of all modules
   - Identifies macro definitions (`createMacro` calls)

2. **Macro Detection**
   - When processing a module, bundler checks for macro calls
   - If `CallExpr` callee resolves to a macro definition → special handling

3. **Argument Capture**
   - For each argument to a macro call, capture its AST
   - Collect external references to build the `Closure.references` map
   - Create `Closure` object: `{ expression: AST, references: Map }`

4. **Macro Execution**
   - Extract the macro function from the `createMacro(fn)` definition
   - Execute `fn` with captured `Closure` arguments
   - Get back a `Closure` result (or `[Closure, Map]` with artificial definitions)

5. **AST Replacement**
   - Replace the macro call expression with the result's `expression`
   - Merge result's `references` into the calling module's references
   - Handle reference conflicts with IIFE wrapping if needed

6. **Code Generation**
   - Emit the transformed AST as JavaScript
   - For `Closure` objects in the output, emit calls to `Closure({ expression: ..., references: ... })`

### Reference Conflict Resolution

If a macro result uses local names that conflict with the calling scope:

**Problem:**
```typescript
// Calling module has: const x = 1;
// Macro result uses: x (but refers to a different definition)
```

**Solution:** Wrap in IIFE with renamed parameters
```typescript
((x) => macroResult)(canonicalX)
```

This ensures the macro result's `x` binds to the correct canonical definition.

---

## Runtime Flow

At runtime, the bundled code:

1. **Imports funee types**
   - `Closure` constructor is available
   - Host functions are linked to native ops

2. **Constructs Closures**
   - Generated code calls `Closure({ expression: ..., references: ... })`
   - Creates runtime `Closure` objects with serialized AST

3. **Executes host functions**
   - Calls to `log`, `debug` etc. invoke Rust ops via deno_core

4. **No macro execution**
   - All macros have been expanded at bundle time
   - `createMacro` never runs at runtime

---

## Example: The `closure` Macro

This is the canonical example from the test fixtures.

### Definition

```typescript
import { createMacro, Closure, CanonicalName } from "funee";

export const closure = createMacro(<T>(input: Closure<T>): Closure<Closure<T>> => {
  // Runs at BUNDLE TIME
  // `input` is the captured argument AST + references
  
  // Return a Closure that constructs the input Closure at runtime
  return {
    expression: {
      type: "CallExpression",
      callee: { type: "Identifier", name: "Closure" },
      arguments: [{
        type: "ObjectExpression",
        properties: [
          { key: "expression", value: serializeAST(input.expression) },
          { key: "references", value: serializeReferences(input.references) }
        ]
      }]
    },
    references: new Map([
      ["Closure", { uri: "funee", name: "Closure" }]
    ])
  };
});
```

### Usage

```typescript
import { closure, Closure, log } from "funee";

const add = (a: number, b: number) => a + b;
const addClosure: Closure<typeof add> = closure(add);

export default function() {
  log(`AST type: ${addClosure.expression.type}`);
  log(`Has references: ${addClosure.references.size >= 0}`);
}
```

### What Happens

**Bundle Time:**
1. Bundler sees `closure(add)` call
2. Recognizes `closure` as a macro
3. Captures `add`'s AST: `(a, b) => a + b`
4. Creates `Closure` object with empty references (no external refs)
5. Executes the `closure` macro function with this `Closure`
6. Gets back a `Closure` with AST that constructs the input `Closure`
7. Replaces `closure(add)` with the returned AST

**Generated Code:**
```typescript
const add = (a, b) => a + b;
const addClosure = Closure({
  expression: { type: "ArrowFunctionExpression", params: [...], body: {...} },
  references: {}
});

export default function() {
  log(`AST type: ${addClosure.expression.type}`);
  log(`Has references: ${addClosure.references.size >= 0}`);
}
```

**Runtime:**
- `Closure()` constructor creates the `Closure` object
- `log()` calls invoke the native `op_log`
- Prints: `AST type: ArrowFunctionExpression` and `Has references: true`

---

## Design Decisions

### Why Separate `core.ts` and `host.ts`?

- **Clarity:** Distinguishes between macro system types and runtime functions
- **Modularity:** Makes it clear what runs at bundle time vs runtime
- **Extensibility:** Easy to add new host functions without cluttering core types

### Why Use `Map` for References?

- **Order independence:** Object key order can vary, Maps preserve insertion order
- **Non-string keys:** Although current keys are strings, Maps support any key type
- **Clearer semantics:** Makes it explicit that this is a key-value mapping

### Why `declare` for Host Functions?

- **No implementation:** Host functions are implemented in Rust, not TypeScript
- **Type safety:** Users get proper TypeScript types and autocomplete
- **Clarity:** `declare` signals that the implementation is external

### Why Allow Plain Objects in `Closure()` Constructor?

- **Compatibility:** Serialized data from Rust may come as plain objects
- **Convenience:** Users can pass `{ references: { x: {...}, y: {...} } }` instead of constructing a Map
- **Runtime conversion:** The constructor normalizes to Map internally

---

## Future Considerations

### Macro Composition

Can macros call other macros?

**Current state:** Not explicitly supported, needs testing

**Design implication:** May need to iterate macro expansion until no macro calls remain

### Async Macros

Should macro functions be able to be async?

**Current state:** No support for async

**Use case:** Fetching remote data during bundling

**Challenge:** Rust execution of JS async functions is complex

### Error Handling

How to provide good error messages when macros fail?

**Current:** Rust panic with stack trace

**Desired:**
- Show original source location (pre-transformation)
- Include macro name and call site
- Preserve JavaScript error messages from macro execution

### Performance

Macro execution adds overhead to bundling:
- Starting JS runtime
- Serializing AST to/from JavaScript
- Executing transformation functions

**Optimizations:**
- Cache macro results (macros should be deterministic)
- Batch multiple macro executions in one runtime
- Pre-compile frequently-used macros

---

## Comparison to Similar Systems

### Babel Macros

**Similarities:**
- Compile-time transformation
- AST manipulation
- User-defined macros in JavaScript

**Differences:**
- Babel macros run in Node.js build step
- funee macros are part of the bundler (no separate step)
- funee uses Rust + embedded JS runtime

### Rust Procedural Macros

**Similarities:**
- Compile-time execution
- Transform code before runtime

**Differences:**
- Rust macros are Rust code manipulating Rust AST
- funee macros are JS/TS code manipulating JS/TS AST
- Rust macros are compiled to native code, funee macros run in JS runtime

### Zig Comptime

**Similarities:**
- First-class compile-time execution
- Same language at compile-time and runtime

**Differences:**
- Zig comptime is fully integrated into the language
- funee macros are an opt-in feature via `createMacro`
- Zig has more powerful compile-time capabilities (types as values, etc.)

---

## Testing Strategy

### Unit Tests

- **Type correctness:** Ensure `Closure`, `CanonicalName` are well-typed
- **Constructor behavior:** `Closure()` handles both Map and object input
- **Error throwing:** `createMacro()` throws if called at runtime

### Integration Tests

- **Simple macro:** Test `closure` macro with basic expressions
- **References:** Test macro with expressions that reference external definitions
- **Conflicts:** Test reference conflict resolution with IIFE wrapping
- **Composition:** Test macro results used as arguments to other macros

### End-to-End Tests

- **Full bundling:** Bundle a module with macros, execute result
- **Host functions:** Verify `log`, `debug` work in bundled code
- **Complex transformations:** Test macros that significantly transform AST

---

## Documentation Needs

### User-Facing Docs

- **Getting Started:** How to use funee macros
- **API Reference:** All exported types and functions with examples
- **Macro Writing Guide:** How to write custom macros
- **Troubleshooting:** Common errors and solutions

### Developer Docs

- **Architecture:** This document
- **Bundler Integration:** How the bundler processes macros
- **Adding Host Functions:** Step-by-step guide
- **Testing Macros:** How to test macro definitions

---

## Open Questions

1. **Module Resolution:** How should `import { X } from "funee"` resolve?
   - Option A: `funee-lib/index.ts` is copied to a known location
   - Option B: Bundler synthesizes the module from known exports
   - **Current approach:** Likely B (bundler-synthesized)

2. **Versioning:** How to version the standard library?
   - Should it be tied to bundler version?
   - Can users pin specific funee lib versions?

3. **Extension:** Should users be able to define custom host functions?
   - Use case: Plugin system for the runtime
   - Challenge: Requires dynamic op registration

4. **Type Generation:** Should the bundler generate `.d.ts` files?
   - Use case: IDE support, type checking
   - Current: Types are in the source `.ts` files

---

## Conclusion

The funee standard library is a thin, well-designed interface between user code and the bundler's macro system. By separating core types, host functions, and providing clear documentation, it enables powerful compile-time metaprogramming while maintaining simplicity and type safety.

The two-phase execution model (bundle-time for macros, runtime for host functions) keeps the architecture clean and the implementation feasible. Future enhancements can build on this foundation without breaking the core design.
