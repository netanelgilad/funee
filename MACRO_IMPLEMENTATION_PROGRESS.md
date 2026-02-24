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

## 🔄 NEXT STEPS: Step 2 - Macro Call Detection

### Goal
When a macro is called (e.g., `closure(add)`), we need to:
1. Detect that `closure` is a macro (we can now do this!)
2. NOT bundle the argument `add` normally
3. Capture `add`'s AST as a Closure object
4. Execute the macro function at bundle time

### Implementation Plan

#### 2.1 Detect Macro Calls in Source Graph
**File:** `src/execution_request/source_graph.rs`

When building the dependency graph, we currently treat all call expressions the same. We need to:
- Check if the callee of a CallExpr is a reference to a Macro declaration
- If yes, handle it specially instead of following normal bundling flow

**Pseudocode:**
```rust
// In SourceGraph::load or get_references_from_declaration
match expr {
    Expr::Call(call_expr) => {
        // Check if callee is a macro
        if is_macro_call(&call_expr, &definitions) {
            // Special handling: capture argument AST
            handle_macro_call(call_expr, definitions)
        } else {
            // Normal call - follow references
            follow_normal_references(call_expr)
        }
    }
}
```

#### 2.2 Capture Argument AST
**New module:** `src/execution_request/capture_closure.rs`

Create a function that:
- Takes an expression (the argument to the macro)
- Extracts its AST
- Finds all external references in the expression
- Returns a Closure object: `{ expression: AST, references: Map }`

**Signature:**
```rust
pub fn capture_closure(
    expr: &Expr,
    source_map: &SourceMap,
    unresolved_mark: (&Globals, Mark)
) -> ClosureValue {
    // 1. Clone the AST of expr
    // 2. Get references using get_references_from_ast
    // 3. Build CanonicalName map for each reference
    // 4. Return ClosureValue { expression: AST, references: Map }
}
```

#### 2.3 Execute Macro at Bundle Time
**File:** `src/execution_request/execute_macro.rs` (new)

We need to:
1. Take the macro function (from `Declaration::Macro`)
2. Take the captured Closure value (from step 2.2)
3. Execute the macro function with the Closure as input
4. Get back a new Closure (the result)
5. Emit code that constructs this result Closure at runtime

**This is the hardest part** - we need to evaluate TypeScript/JavaScript at bundle time!

Options:
- Use Deno runtime to execute the macro function
- Convert the macro function to a format we can evaluate
- Use an embedded JS engine

#### 2.4 Emit Closure Construction Code
**File:** `src/execution_request/declaration.rs`

Update `Declaration::Macro` handling in `into_module_item()`:
- Instead of emitting the macro function
- Emit code that constructs the Closure object
- Example: `var addClosure = Closure({ expression: ..., references: ... })`

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

## 📊 Current State

- ✅ Macro declarations are detected
- ✅ Bundler knows which functions are macros
- ⏳ Macro calls are NOT yet detected
- ⏳ Arguments are still bundled normally
- ⏳ Macros are NOT executed at bundle time
- ⏳ Closure objects are NOT constructed

---

## 🎯 Immediate Next Action

**Focus on Step 2.1:** Detect macro calls in the source graph

Start in `src/execution_request/source_graph.rs` or `get_references_from_declaration.rs`:
1. Find where CallExpr is handled
2. Add logic to check if the callee is a macro
3. Add a marker or special handling for macro calls
4. Write a test that verifies macro calls are detected

Once macro calls are detected, we can move to capturing AST (step 2.2).
