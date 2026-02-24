# Step 2 Implementation: Capture Macro Call Arguments as Closures

**Status:** ✅ COMPLETE

## Overview

Step 2 adds the ability to detect macro calls and capture their arguments as `Closure` objects instead of following normal bundling rules. When code like `closure(add)` is encountered where `closure` is a macro, the argument `add` is captured with its AST and out-of-scope references.

## What Changed

### 1. New Types

**File:** `src/execution_request/closure.rs`
- Added `Closure` struct that holds:
  - `expression: Expr` - The captured AST node
  - `references: HashMap<String, FuneeIdentifier>` - Map of variable names to their canonical definitions

### 2. New Declaration Variant

**File:** `src/execution_request/declaration.rs`
- Added `Declaration::ClosureValue(Closure)` variant
- Represents a captured closure that will be emitted as a Closure object at runtime
- Added handling in `into_module_item()` to emit closures (currently as plain expressions, TODO: emit proper Closure construction)

### 3. Macro Call Detection

**File:** `src/execution_request/detect_macro_calls.rs`
- New module for finding macro calls in expressions
- `MacroCall` struct captures:
  - `macro_name: String` - The name of the macro function
  - `arguments: Vec<Expr>` - The argument expressions passed to the macro
- `MacroCallFinder` visitor walks the AST looking for `CallExpr` nodes where the callee is a known macro
- `find_macro_calls()` function returns all macro calls found in an expression

### 4. Closure Capture Logic

**File:** `src/execution_request/capture_closure.rs`
- `capture_closure()` function that:
  1. Takes an expression (the macro argument)
  2. Analyzes it to find all variable references
  3. Filters to only out-of-scope references (defined in parent scope)
  4. Returns a `Closure` with the expression and its reference map

### 5. Two-Pass Graph Construction

**File:** `src/execution_request/source_graph.rs`
- Modified `SourceGraph::load()` to do two passes:
  1. **Pass 1 (existing):** Build the dependency graph normally, track macro definitions
  2. **Pass 2 (new):** `process_macro_calls()` method that:
     - Iterates through all nodes
     - Checks if expressions contain macro calls
     - For each macro call argument, captures it as a Closure
     - Adds Closure nodes to the graph

### 6. Reference Handling Updates

**File:** `src/execution_request/get_references_from_declaration.rs`
- Added `Declaration::ClosureValue` case to `get_references_from_declaration()`
  - Returns the reference names from the closure's reference map
- Added `Declaration::ClosureValue` case to `rename_references_in_declaration()`
  - Renames references in the closure expression AST
- Made `get_references_from_ast()` public so `capture_closure` can use it

## How Argument Capture Works

### Example Code
```typescript
import { closure } from "./macro-lib.ts";

const add = (a: number, b: number) => a + b;
const addClosure = closure(add);
```

### Processing Flow

1. **Graph Construction (Pass 1)**
   - Load `entry.ts`, find declarations: `add`, `addClosure`, `default`
   - Follow import to `macro-lib.ts`, find `closure` declaration
   - Detect that `closure` is created via `createMacro()` → mark as macro
   - Add nodes and edges to graph

2. **Macro Processing (Pass 2)**
   - Iterate through all nodes looking for expressions
   - Find `addClosure = closure(add)` node
   - Detect `closure(...)` is a macro call (callee resolves to a macro)
   - Extract argument: `add` (identifier expression)
   - Build scope references map: `{ "closure": ..., "add": ... }`
   - Call `capture_closure(add, scope_refs)`:
     - Get references from `add` expression → finds `"add"`
     - Filter to out-of-scope: `"add"` is in scope_refs → include it
     - Return `Closure { expression: Ident("add"), references: {"add": FuneeIdentifier{...}} }`
   - Create new graph node: `Declaration::ClosureValue(closure)`
   - Add edge from `addClosure` node to the new Closure node

3. **Result**
   - Graph now has a `ClosureValue` node containing:
     - The expression `add` (as written)
     - A reference map showing `add` points to the arrow function

### Why Capture the Identifier, Not the Definition?

The captured Closure stores the *expression as written* (`add`) plus a map of what `add` refers to. This preserves the original code structure while providing the information needed to resolve references. Later, when the macro is executed, it can:
- Access the expression AST directly
- Resolve references through the reference map
- Transform or inline the expression as needed

## Test Cases

### Test 1: Macro Detection
**File:** `src/execution_request/tests.rs::test_macro_detection`
- Verifies that `createMacro()` calls are detected
- Checks that the macro function is stored as `Declaration::Macro`

### Test 2: Macro Tracking
**File:** `src/execution_request/tests.rs::test_macro_functions_tracked_in_source_graph`
- Verifies that macros are tracked in `SourceGraph.macro_functions`
- Ensures the set is populated during graph construction

### Test 3: Argument Capture (NEW)
**File:** `src/execution_request/tests.rs::test_macro_call_argument_captured_as_closure`
- **Input:** `const addClosure = closure(add)` where `closure` is a macro
- **Verifies:**
  - A `ClosureValue` node is created in the graph
  - The captured expression is the identifier `add`
  - The reference map contains `{"add": FuneeIdentifier{...}}`
- **Output:** ✅ Closure correctly captures the argument

### Test 4: Closure Capture Logic
**File:** `src/execution_request/capture_closure.rs::test_capture_closure_with_no_references`
- Tests capturing a literal (no external references)

**File:** `src/execution_request/capture_closure.rs::test_capture_closure_with_references`
- Tests capturing an identifier with external references

### Test 5: Macro Call Detection
**File:** `src/execution_request/detect_macro_calls.rs::test_find_macro_call`
- Tests that `closure(add)` is detected as a macro call

**File:** `src/execution_request/detect_macro_calls.rs::test_no_macro_calls`
- Tests that regular function calls are not mistaken for macro calls

## Current Limitations & TODOs

1. **Closure Emission**
   - Currently, `Declaration::ClosureValue` emits just the expression
   - TODO: Emit proper Closure construction: `Closure({ expression: ..., references: {...} })`

2. **Macro Execution**
   - Closures are captured but not yet passed to macro functions
   - TODO: Step 3 will execute the macro function with the captured Closures

3. **Multiple Arguments**
   - Code supports multiple arguments
   - Test only covers single argument
   - TODO: Add test for `macro(arg1, arg2, arg3)`

4. **Nested Macro Calls**
   - What if a macro call argument contains another macro call?
   - Currently untested
   - TODO: Add test for `macro1(macro2(arg))`

5. **Reference Filtering**
   - Currently captures all out-of-scope references
   - May need refinement based on macro semantics

## Integration Points

### For Step 3 (Macro Execution)
When implementing macro execution, you'll need to:
1. Get the macro function from `Declaration::Macro`
2. Collect the `ClosureValue` arguments for a macro call
3. Execute the macro function (in JS runtime) with the Closures
4. Get back a transformed Closure result
5. Replace the macro call with the result expression

### For Code Emission
When emitting the final bundle, `Declaration::ClosureValue` needs to:
1. Serialize the expression AST to a string
2. Serialize the references map to a JavaScript object
3. Emit: `Closure({ expression: <ast>, references: <map> })`

## Testing Commands

```bash
# Run all tests
cargo test --lib

# Run just the macro tests
cargo test test_macro

# Run with output
cargo test test_macro_call_argument_captured_as_closure -- --nocapture
```

## Summary

Step 2 successfully implements macro call detection and argument capture. When a macro call like `closure(add)` is encountered:
- The call is detected via AST traversal
- The argument `add` is captured as a `Closure` object
- The Closure contains both the expression and its out-of-scope references
- A new graph node is created to represent the captured Closure

This provides the foundation for Step 3 (macro execution), which will take these captured Closures, pass them to the macro function, and transform the code accordingly.
