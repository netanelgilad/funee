# Step 2 Complete: Macro Call Argument Capture

**Date:** 2026-02-24  
**Status:** ✅ COMPLETE

## Summary

Successfully implemented detection and capture of macro call arguments as Closures. When code like `closure(add)` is encountered where `closure` is a macro, the argument `add` is now captured with its AST and out-of-scope references instead of being bundled normally.

## What Works Now

```typescript
const add = (a, b) => a + b;
const addClosure = closure(add);  // ← argument captured!
```

When `closure(add)` is encountered:
1. Detects `closure` is a macro (via `createMacro`)
2. Captures `add` as `Closure { expression, references }`
3. Creates `ClosureValue` node in dependency graph
4. Preserves references to external definitions

## Implementation Details

### New Components

1. **Closure Type** (`src/execution_request/closure.rs`)
   - Holds `expression: Expr` (AST)
   - Holds `references: HashMap<String, FuneeIdentifier>` (out-of-scope refs)

2. **Declaration::ClosureValue Variant**
   - New declaration type for captured closures
   - Integrated into reference handling

3. **Macro Call Detection** (`src/execution_request/detect_macro_calls.rs`)
   - AST visitor finds macro calls
   - Extracts arguments for capture

4. **Closure Capture Logic** (`src/execution_request/capture_closure.rs`)
   - Analyzes expression for references
   - Filters to out-of-scope only
   - Returns Closure object

5. **Two-Pass Graph Construction** (`src/execution_request/source_graph.rs`)
   - Pass 1: Build dependency graph normally
   - Pass 2: Process macro calls, capture arguments

## Tests

### Unit Tests (8/8 passing)
- `test_macro_detection` - Macro definitions detected
- `test_macro_functions_tracked_in_source_graph` - Macros tracked
- `test_macro_call_argument_captured_as_closure` - Arguments captured ✨ NEW
- `test_capture_closure_with_no_references` - Literal capture
- `test_capture_closure_with_references` - Reference capture
- `test_find_macro_call` - Macro call detection
- `test_no_macro_calls` - Regular calls not confused

### E2E Test
- **File:** `tests/cli.test.ts`
- **Fixture:** `tests/fixtures/macro/step2_argument_capture.ts`
- **Test:** "detects macro calls and captures arguments (Step 2)"
- **Status:** ✅ PASSING

## Commits

1. `7e0d0eb` - Step 2 implementation + documentation
   - All Rust implementation
   - STEP2_IMPLEMENTATION.md
   - Updated MACRO_IMPLEMENTATION_PROGRESS.md

2. `9e193f9` - E2E test (retroactive)
   - Added to tests/cli.test.ts
   - Created fixture file

## Lesson Learned: TDD

**Important:** This implementation was done **backwards** from PLAYBOOK.md!

**Should have been:**
1. Write E2E test first (see it fail)
2. Implement Step 2
3. See test pass
4. Commit together

**What actually happened:**
1. Implemented Step 2
2. Wrote unit tests
3. Added E2E test retroactively
4. Committed separately

**For Step 3 and beyond:** Follow PLAYBOOK.md strictly!
- Write E2E test FIRST
- Watch it fail
- Implement
- Watch it pass
- Commit together

## Documentation

- **STEP2_IMPLEMENTATION.md** - Full implementation details
- **MACRO_IMPLEMENTATION_PROGRESS.md** - Roadmap and progress
- **DESIGN-MACROS.md** - Original design document

## Next Steps

### Step 3: Macro Execution

Execute macro functions at bundle time using deno_core:

1. Get macro function from `Declaration::Macro`
2. Get captured `ClosureValue` arguments
3. Execute macro function in JS runtime
4. Get back transformed Closure result
5. Replace macro call with result expression
6. Handle reference conflicts (IIFE wrapping)

**Key Challenge:** Need to serialize Rust AST to JavaScript and back.

**Estimated Complexity:** High (requires deno_core integration)

## Files Changed

### Implementation
- `src/execution_request.rs` - Added new modules
- `src/execution_request/closure.rs` - New
- `src/execution_request/declaration.rs` - Added ClosureValue variant
- `src/execution_request/capture_closure.rs` - New
- `src/execution_request/detect_macro_calls.rs` - New
- `src/execution_request/source_graph.rs` - Two-pass construction
- `src/execution_request/get_references_from_declaration.rs` - Updated for ClosureValue

### Tests
- `src/execution_request/tests.rs` - New unit test
- `tests/cli.test.ts` - New E2E test
- `tests/fixtures/macro/step2_argument_capture.ts` - New fixture

### Documentation
- `STEP2_IMPLEMENTATION.md` - New
- `MACRO_IMPLEMENTATION_PROGRESS.md` - Updated
- `STEP2_COMPLETE.md` - This file

## References

- Original implementation: `~/clawd/agents/riff/repos/everything/opah/`
- Design document: `DESIGN-MACROS.md`
- Test file: `tests/cli.test.ts`
- Fixture: `tests/fixtures/macro/step2_argument_capture.ts`
