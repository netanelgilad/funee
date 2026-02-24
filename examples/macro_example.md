# Macro Execution Example

This example demonstrates how macros are executed during bundling in funee.

## Input Code

### macro.ts
```typescript
import { createMacro } from '@opah/core';

// A simple macro that adds 1 to any expression
export const addOne = createMacro((x) => {
  return Closure({
    expression: `(${x.expression}) + 1`,
    references: x.references
  });
});

// A macro that doubles an expression
export const double = createMacro((x) => {
  return Closure({
    expression: `(${x.expression}) * 2`,
    references: x.references
  });
});

// A macro that composes two operations
export const addOneThenDouble = createMacro((x) => {
  // This shows recursion: macro calling another macro
  return double(addOne(x));
});
```

### main.ts
```typescript
import { addOne, double, addOneThenDouble } from './macro.ts';

// These macro calls will be expanded at bundle time
const a = addOne(5);              // Expands to: (5) + 1
const b = double(10);             // Expands to: (10) * 2
const c = addOneThenDouble(3);    // Expands to: ((3) + 1) * 2

console.log(a, b, c);
```

## Execution Flow

### Step 1: Graph Construction

When funee loads `main.ts`, it:
1. Parses and identifies imports
2. Loads `macro.ts` and detects `addOne`, `double`, `addOneThenDouble` are macros
3. Adds them to `SourceGraph.macro_functions` set
4. Builds the dependency graph

**Graph structure:**
```
main.ts (Declaration::Expr)
  └─ references: { addOne, double, addOneThenDouble }
       ↓
macro.ts::addOne (Declaration::Macro)
  └─ function: (x) => Closure({ ... })

macro.ts::double (Declaration::Macro)
  └─ function: (x) => Closure({ ... })

macro.ts::addOneThenDouble (Declaration::Macro)
  └─ function: (x) => double(addOne(x))
  └─ references: { addOne, double }
```

### Step 2: Macro Processing (Iteration 1)

**Process `main.ts` node:**

1. **Find macro calls:** `addOne(5)`, `double(10)`, `addOneThenDouble(3)`

2. **Execute `addOne(5)`:**
   ```rust
   // Create Closure from argument
   let arg = Closure {
       expression: "5",
       references: HashMap::new()
   };
   
   // Get macro function code
   let macro_fn = r#"
       (x) => {
           return Closure({
               expression: `(${x.expression}) + 1`,
               references: x.references
           });
       }
   "#;
   
   // Execute in deno_core
   let result = runtime.execute_macro(macro_fn, vec![arg]).await?;
   // result.closure.expression = "(5) + 1"
   ```

3. **Execute `double(10)`:**
   ```rust
   let arg = Closure { expression: "10", references: HashMap::new() };
   let result = runtime.execute_macro(double_fn, vec![arg]).await?;
   // result.closure.expression = "(10) * 2"
   ```

4. **Execute `addOneThenDouble(3)`:**
   ```rust
   let arg = Closure { expression: "3", references: HashMap::new() };
   let macro_fn = "(x) => double(addOne(x))";
   let result = runtime.execute_macro(macro_fn, vec![arg]).await?;
   // Result contains a macro call! double(addOne(...))
   // Need another iteration to expand
   ```

5. **Replace AST:**
   ```typescript
   const a = (5) + 1;              // ✓ Expanded
   const b = (10) * 2;             // ✓ Expanded
   const c = <still has macro call>; // Needs iteration 2
   ```

### Step 3: Macro Processing (Iteration 2)

The result of `addOneThenDouble(3)` contains macro calls that need expansion.

**When JS executes:**
```javascript
const macroFn = (x) => double(addOne(x));
const arg = { expression: "3", references: new Map() };
const result = macroFn(arg);
```

**If macros are available in the JS context:**
```javascript
// addOne(x) returns:
{ expression: "(3) + 1", references: Map {} }

// double(that result) returns:
{ expression: "((3) + 1) * 2", references: Map {} }
```

**Result after iteration 2:**
```typescript
const c = ((3) + 1) * 2;  // ✓ Fully expanded
```

### Step 4: Final Bundle

No macro calls remain. Generate final code:

```javascript
const a = (5) + 1;
const b = (10) * 2;
const c = ((3) + 1) * 2;

console.log(a, b, c);
```

## Key Insights

### 1. Recursive Execution

The example shows why iterative expansion is necessary:
- `addOneThenDouble` calls `double` and `addOne` inside the macro
- First iteration expands `addOneThenDouble(3)` to a result containing `double(addOne(...))`
- Second iteration expands those nested macro calls
- Process continues until no macros remain

### 2. Closures Preserve Context

When `addOne(5)` is called:
```typescript
// Input closure:
{
  expression: "5",
  references: Map {}  // No external references
}

// If it was addOne(x) where x is imported:
{
  expression: "x",
  references: Map { "x" => { uri: "./values.ts", name: "x" } }
}
```

The macro result preserves these references so the final code knows where `x` comes from.

### 3. Macros in JS, Orchestration in Rust

- **Rust:** Graph construction, macro detection, AST manipulation
- **JS (deno_core):** Execute macro functions (user code is JS)
- **Rust:** Take JS results, parse back to AST, continue bundling

This separation is clean:
- Users write macros in JS/TS (familiar)
- Funee orchestrates at the Rust level (control + performance)

## Reference Handling Example

### Input with References

```typescript
// utils.ts
export const add = (a, b) => a + b;

// macro.ts
import { createMacro } from '@opah/core';

export const withHelper = createMacro((x) => {
  const refs = new Map(x.references);
  refs.set('add', CanonicalName({ uri: './utils.ts', name: 'add' }));
  
  return Closure({
    expression: `add(${x.expression}, 10)`,
    references: refs
  });
});

// main.ts
import { withHelper } from './macro.ts';

const result = withHelper(5);
```

### Expansion Process

1. **Create argument Closure:**
   ```rust
   Closure {
       expression: "5",
       references: {} // No external refs in "5"
   }
   ```

2. **Execute macro:**
   ```javascript
   const x = { expression: "5", references: Map {} };
   const refs = new Map(x.references);
   refs.set('add', { uri: './utils.ts', name: 'add' });
   
   return {
       expression: "add(5, 10)",
       references: refs  // Now contains 'add' reference
   };
   ```

3. **Result:**
   ```rust
   MacroResult::Simple {
       closure: Closure {
           expression: "add(5, 10)",
           references: {
               "add": ("./utils.ts", "add")
           }
       }
   }
   ```

4. **Replace call site:**
   ```typescript
   const result = add(5, 10);  // 'add' is in scope from macro's references
   ```

5. **Graph knows to include utils.ts:**
   Because the result has a reference to `./utils.ts::add`, funee adds that to the bundle.

## Performance Characteristics

### Macro Execution Cost

For each macro call:
1. **Serialize arguments:** ~1μs per argument (JSON)
2. **Execute in JS:** ~10-100μs (depends on macro complexity)
3. **Deserialize result:** ~1μs (JSON)
4. **Parse result to AST:** ~10-50μs (SWC parser)

**Total per call:** ~20-150μs

### Caching Opportunities

Macros are pure functions:
```rust
// Same input → same output
cache.get(&(macro_fn, args)) => Option<MacroResult>
```

For repetitive macros (e.g., used 100 times with same args), caching provides 100x speedup.

### Iterative Expansion

- Most macros: 1 iteration (no recursion)
- Nested macros: 2-3 iterations
- Deeply nested: 4-10 iterations (rare)

With 100μs per call and 10 macros per module, macro processing adds ~1ms per module.

## Error Handling

### Macro Execution Error

```typescript
export const broken = createMacro((x) => {
  throw new Error("Oops!");
});

const result = broken(5);
```

**Error output:**
```
Macro execution failed: Error: Oops!
    at <macro function>:2:9
    at [funee:macro_exec]:4:23

Macro: (x) => { throw new Error("Oops!"); }
Call site: main.ts:3:15
```

### Infinite Recursion

```typescript
export const infinite = createMacro((x) => {
  return infinite(x);  // Calls itself!
});
```

**After max_iterations:**
```
Error: Macro expansion exceeded max iterations (possible infinite recursion)
Macro call chain:
  1. main.ts:5 - infinite(5)
  2. <expanded> - infinite(5)
  3. <expanded> - infinite(5)
  ... (100 times)
```

## Next Steps

This example demonstrates the core concept. To make it real:

1. **Implement detection:** Identify macros during graph construction
2. **Implement MacroRuntime:** Set up deno_core with helpers
3. **Implement visitor:** Replace macro calls in AST
4. **Handle references:** Track and merge reference maps
5. **Test end-to-end:** Real macros in real code

See `STEP3_MACRO_EXECUTION.md` for the complete design.
