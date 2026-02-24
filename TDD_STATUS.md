# TDD Status - funee Standard Library

## Current State: Tests Written, Implementation Pending

Following the PLAYBOOK.md TDD workflow:

### ✅ Step 1: Tests Written (DONE)

Created E2E tests in `tests/cli.test.ts` for funee standard library functionality:

**Test Suite: "funee standard library"**
- ✅ `imports Closure type from "funee"` - Test type imports work
- ✅ `uses Closure constructor at runtime` - Test runtime Closure() function
- ✅ `imports log from "funee"` - Test host function imports
- ✅ `imports multiple exports from "funee"` - Test combined imports
- ✅ `Closure constructor accepts plain object references` - Test object → Map conversion
- ✅ `Closure constructor accepts Map references` - Test direct Map usage
- ✅ `imports createMacro from "funee"` - Test createMacro import
- ✅ `createMacro throws at runtime if not expanded` - Test safety check

**Fixtures Created:**
- `tests/fixtures/funee-lib/import-types.ts`
- `tests/fixtures/funee-lib/closure-constructor.ts`
- `tests/fixtures/funee-lib/import-log.ts`
- `tests/fixtures/funee-lib/multiple-imports.ts`
- `tests/fixtures/funee-lib/closure-plain-refs.ts`
- `tests/fixtures/funee-lib/closure-map-refs.ts`
- `tests/fixtures/funee-lib/import-create-macro.ts`
- `tests/fixtures/funee-lib/createMacro-throws.ts`

### ⏳ Step 2: Tests Should Fail (BLOCKED)

Cannot run tests yet due to:
- WIP macro implementation files causing compilation errors
- Moved to `.wip/` directory temporarily:
  - `capture_closure.rs`
  - `detect_macro_calls.rs`
  - `macro_runtime.rs` (multiple versions)
  - `macro_helpers.js`
  - `process_macros_integration.rs`
- Commented out mod declarations in `src/execution_request.rs`
- Commented out uses in `src/execution_request/source_graph.rs`

**Note:** Need clean Rust build before running tests.

### ⏸️ Step 3: Implementation (TODO)

Once tests can run and fail, implement:

1. **Resolve "funee" imports**
   - Update `load_module_declaration.rs` to recognize "funee" as virtual module
   - Point to `funee-lib/index.ts` for type resolution
   
2. **Bundle funee-lib code**
   - Include `funee-lib/core.ts` exports in bundled output
   - `Closure` constructor function
   - `createMacro` function (throws at runtime)
   - `CanonicalName` type (TypeScript only, not runtime)
   
3. **Link host functions**
   - `log` → `op_log` (already implemented)
   - `debug` → `op_debug` (needs implementation)

4. **Test-driven fixes**
   - Run tests
   - Fix failures one by one
   - Commit when each test passes

### 📋 Next Actions

1. **Clean build environment**
   ```bash
   cargo clean
   cargo build --release
   ```

2. **Run tests to verify they fail**
   ```bash
   cd tests && npm test -- --run
   ```

3. **Implement bundler support**
   - Start with simplest test: `import-log.ts`
   - Make it pass
   - Move to next test

4. **Iterate until all tests pass**
   - Commit after each passing test
   - Document any design changes

## Why This Approach?

From PLAYBOOK.md:
> Write the test FIRST (in tests/cli.test.ts)
> Test should fail initially
> Implement the feature
> Test should pass
> Commit with both test and implementation

Benefits:
- ✅ Clear acceptance criteria (tests define success)
- ✅ Prevents over-engineering (only implement what tests need)
- ✅ Regression protection (tests verify nothing breaks)
- ✅ Documentation (tests show how to use the feature)

## Design Notes

The funee standard library provides:
- **Core types** (`Closure`, `CanonicalName`) for macro system
- **Runtime functions** (`Closure()` constructor) for bundler-generated code
- **Host functions** (`log`, `debug`) implemented in Rust
- **Compile-time markers** (`createMacro`) for macro definitions

See `funee-lib/FUNEE_LIB_DESIGN.md` for full architecture.
