# Macro Detection Implementation - Progress Report

## ✅ COMPLETED: Step 1 - Macro Detection

### What Was Implemented

1. **Added `Declaration::Macro` variant** (`src/execution_request/declaration.rs`)
   - New enum variant to represent macro declarations
   - Stores the macro function expression that will be executed at bundle time
   - Added handling in `into_module_item()` to emit macros as regular variables (temporary)

2. **Implemented `createMacro()` detection** (`src/execution_request/get_module_declarations.rs`)
   - Added `extract_macro_function()` helper that detects the pattern: `createMacro(fn)`
   - Modified variable declaration parsing to check if init expression is a `createMacro()` call
   - When detected, creates `Declaration::Macro` instead of `Declaration::VarInit`

3. **Updated reference handling** (`src/execution_request/get_references_from_declaration.rs`)
   - Added `Declaration::Macro` case to `get_references_from_declaration()`
   - Added `Declaration::Macro` case to `rename_references_in_declaration()`
   - Macros are treated like regular expressions for reference tracking

4. **Added comprehensive test** (`src/execution_request/tests.rs`)
   - Test verifies that `closure = createMacro(...)` is detected as a Macro
   - Test verifies that `createMacro` itself is NOT detected as a Macro
   - ✅ All tests pass

### How It Works

**Before:**
```typescript
export const closure = createMacro((input) => { ... });
```
Was parsed as `Declaration::VarInit(CallExpr)` - a regular variable with a function call.

**After:**
```typescript
export const closure = createMacro((input) => { ... });
```
Is now parsed as `Declaration::Macro(ArrowExpr)` - the bundler knows this is a compile-time macro.

### Test Results
```
✅ Successfully detected 'closure' as a Macro!
✅ createMacro correctly identified as regular function
```

---

## ✅ COMPLETED: Step 2 - Macro Call Detection & Argument Capture

### What Was Implemented

See **STEP2_IMPLEMENTATION.md** for full details.

1. **Added Closure type** (`src/execution_request/closure.rs`)
   - `Closure` struct with `expression: Expr` and `references: HashMap<String, FuneeIdentifier>`
   - Represents a captured expression with its out-of-scope references

2. **Added Declaration::ClosureValue variant** (`src/execution_request/declaration.rs`)
   - New variant to represent captured closures
   - Added to reference handling (`get_references_from_declaration.rs`)
   - Emits as expression (TODO: emit proper Closure construction)

3. **Implemented macro call detection** (`src/execution_request/detect_macro_calls.rs`)
   - `MacroCall` struct captures macro name and arguments
   - `MacroCallFinder` visitor walks AST to find macro calls
   - `find_macro_calls()` function detects calls where callee is a known macro

4. **Implemented closure capture logic** (`src/execution_request/capture_closure.rs`)
   - `capture_closure()` takes an expression and scope references
   - Analyzes expression to find all variable references
   - Filters to only out-of-scope references
   - Returns `Closure` with expression + reference map

5. **Two-pass graph construction** (`src/execution_request/source_graph.rs`)
   - Pass 1: Build graph normally, track macro definitions
   - Pass 2: `process_macro_calls()` finds macro calls and captures arguments
   - For each macro call argument, creates a `ClosureValue` node in the graph

### How It Works

When code like `const addClosure = closure(add)` is processed:
1. Graph construction identifies `closure` as a macro
2. Second pass detects the call `closure(add)`
3. Argument `add` is captured with `capture_closure()`
4. Creates `Closure { expression: Ident("add"), references: {"add": ...} }`
5. Adds a `ClosureValue` node to the graph

### Test Results
```
✅ test_macro_call_argument_captured_as_closure - PASS
✅ Closure correctly captures identifier and references
✅ All 8 tests passing
```

---

## 📋 Testing Plan

### Test 1: Simple Macro Call
```typescript
const add = (a, b) => a + b;
const addClosure = closure(add);  // Should capture add's AST
```

Expected result:
- `addClosure` is a Closure object
- `addClosure.expression` contains the arrow function AST
- `addClosure.references` is empty (no external refs)

### Test 2: Macro with References
```typescript
const multiplier = 2;
const mult = (x) => x * multiplier;
const multClosure = closure(mult);  // Should capture mult's AST + multiplier ref
```

Expected result:
- `multClosure.expression` contains the arrow function AST
- `multClosure.references` contains `{ multiplier: { uri: "...", name: "multiplier" } }`

### Test 3: Nested Macros
```typescript
const inner = closure((x) => x + 1);
const outer = closure(inner);  // Macro result as input to another macro
```

---

## 🤔 Open Questions

1. **How to execute macros at bundle time?**
   - Option A: Embed Deno runtime and execute in a sandbox
   - Option B: Convert to a simpler representation we can evaluate
   - Option C: Use quickjs or similar lightweight JS engine

2. **How to handle async macros?**
   - The example macro returns a Closure synchronously
   - Do we need to support async macro functions?

3. **Error handling**
   - What if the macro function throws an error?
   - How do we show helpful error messages with source locations?

4. **Macro composition**
   - Can macros call other macros?
   - How do we handle circular macro dependencies?

---

---

## 🔄 NEXT STEPS: Step 3 - Macro Execution

### Goal
Execute macro functions at bundle time with captured Closures and transform the code.

When a macro call like `closure(add)` is processed:
1. Get the macro function from `Declaration::Macro`
2. Get the captured `ClosureValue` arguments
3. Execute the macro function (in JS runtime) with Closures as arguments
4. Get back a transformed Closure result
5. Replace the macro call expression with the result

### Implementation Challenges

1. **JS Execution at Bundle Time**
   - Need to execute user's macro functions during Rust bundling
   - Options:
     - Embed deno_core runtime
     - Use quickjs
     - Two-pass bundling (bundle → execute → bundle)

2. **AST Serialization**
   - Need to pass Closure objects (Rust AST) to JS macro functions
   - Need to receive transformed Closure results back
   - Options:
     - Serialize AST to JSON
     - Emit to code string, parse in JS, emit back

3. **Macro Result Integration**
   - Replace macro call node with result expression
   - Merge result's references into calling scope
   - Handle reference conflicts (IIFE wrapping)

### Test Plan

```typescript
// Simple identity macro
const add = (a, b) => a + b;
const addClosure = closure(add);
// After macro execution: addClosure should be the Closure object
// containing add's AST

// Macro that transforms the expression
const traced = trace((x) => x + 1);
// After macro execution: traced should be transformed code
// e.g., (x) => { console.log('calling'); return x + 1; }
```

---

## 📊 Current State

- ✅ Macro declarations are detected
- ✅ Bundler knows which functions are macros
- ✅ Macro calls ARE detected
- ✅ Arguments are captured as Closures (not bundled normally)
- ⏳ Macros are NOT yet executed at bundle time
- ⏳ Closure objects are emitted as plain expressions (need proper Closure construction)
- ⏳ Macro transformations are not applied

---

## 🎯 Next Milestone: Step 3

**Implement macro execution with embedded JS runtime**

Priority tasks:
1. Set up deno_core or similar JS runtime for macro execution
2. Implement AST serialization (Rust ↔ JS)
3. Execute macro functions with Closure arguments
4. Replace macro call sites with transformed results
5. Handle reference conflicts and merging

See DESIGN-MACROS.md for detailed design of macro execution phase.
