# Step 3: Macro Execution - TDD Test Results

## ✅ Phase 0 Complete: E2E Tests Written FIRST

Following PLAYBOOK.md, I wrote the tests **before** any implementation.

### Test Results (Before Implementation)

```bash
cd tests && npm test -- --run cli.test.ts
```

**Test Status:**
- ✅ 19 existing tests passing
- ❌ 6 new macro execution tests failing (AS EXPECTED)

### Failing Tests (Good! This is what we want)

#### 1. ❌ expands simple addOne macro at compile time
```
Expected: "6"
Received: "[object Object]"
```

**Why it fails:** Macro is not executed. The call `addOne(5)` returns the closure object instead of executing the macro function at bundle time.

#### 2. ❌ expands macro that adds references
```
Expected: "15"
Received: "[object Object]"
```

**Why it fails:** Same issue - macro not executed, so `withAdd(10)` returns a closure object.

#### 3. ❌ handles recursive macro calls (macro calling macro)
```
Expected: "12"
Received: "[object Object]"
```

**Why it fails:** `addTwo(5)` should expand through multiple iterations, but macros aren't being executed at all.

#### 4. ❌ prevents infinite macro recursion
```
Expected: exit code 1 with error message
Received: exit code 0 (no error)
```

**Why it fails:** No macro execution means no infinite loop detection.

#### 5. ❌ emitted code does not contain macro definitions
```
Expected: "5) + 1" (expanded code)
Received: Full macro function definition in output
```

**Why it fails:** Macros are being bundled as regular functions instead of being executed and removed.

### Test Fixtures Created

All fixtures are in `tests/fixtures/macro/`:

1. **simple_macro.ts** - Basic `addOne(5)` macro
2. **macro_with_refs.ts** - Macro that adds references to closure
3. **recursive_macro.ts** - Macro calling another macro
4. **infinite_macro.ts** - Infinite recursion test case

### What This Proves

✅ **Tests are comprehensive** - They cover:
- Simple macro expansion
- Reference handling
- Recursive expansion
- Error cases (infinite loops)
- Tree-shaking (macros removed from output)

✅ **Tests fail for the right reasons** - Each failure clearly shows what's missing:
- Macros output `[object Object]` → not being executed
- Macro functions in bundle → not being removed
- No error on infinite recursion → no iteration limit

✅ **We know exactly what to implement** - Make these 6 tests pass:
1. Detect macros during graph construction
2. Execute macros using deno_core
3. Replace call sites with results
4. Handle iterative expansion
5. Add max_iterations guard
6. Remove macro definitions from final bundle

## Next Steps

Now that we have failing tests, we implement Step 3 following STEP3_MACRO_EXECUTION.md:

1. **Phase 1:** Implement MacroRuntime with deno_core
2. **Phase 2:** Integrate into SourceGraph
3. **Phase 3:** Handle recursive expansion
4. **Phase 4:** Commit when all tests pass

### Expected Timeline

- Phase 1: 1-2 days
- Phase 2: 2-3 days  
- Phase 3: 1 day
- Total: ~1 week

## TDD Workflow Validation

✅ Followed PLAYBOOK.md exactly:
1. ✅ Wrote E2E tests FIRST in `tests/cli.test.ts`
2. ✅ Created fixtures in `tests/fixtures/macro/`
3. ✅ Tests FAIL before implementation
4. ⏳ Implement the feature (next phase)
5. ⏳ Tests PASS after implementation (success criteria)

This is proper TDD! 🎯
