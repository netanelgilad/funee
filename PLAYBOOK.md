# Funee Development Playbook

**Read this first before doing any work on funee.**

## Core Principles

### 1. TDD with E2E Tests
- **Write the test FIRST** (in `tests/cli.test.ts`)
- Test should fail initially
- Implement the feature
- Test should pass
- Commit with both test and implementation

### 2. Test Structure
```typescript
// tests/cli.test.ts
describe('feature name', () => {
  it('describes expected behavior', async () => {
    const { stdout, exitCode } = await runFunee(['fixture.ts']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('expected output');
  });
});
```

### 3. Fixture Files
- Create test fixtures in `tests/fixtures/`
- Each feature gets its own fixture directory if complex
- Keep fixtures minimal - test one thing at a time

## Architecture Decisions

### Functional Only
- **No class support** - we're building a functional ecosystem
- Functions, arrow functions, closures only
- This keeps the bundler simple and macros predictable

### Macro System
- `createMacro(fn)` marks compile-time macros
- Macros receive `Closure<T>` (AST + references)
- Macros return `Closure<T>` 
- Bundler executes macros via deno_core (recursive!)

### Key Types
```typescript
interface Closure<T> {
  expression: any;  // AST node
  references: Map<string, CanonicalName>;
}

interface CanonicalName {
  uri: string;   // module path
  name: string;  // export name
}
```

## File Structure

```
funee/
├── src/                    # Rust bundler
│   ├── main.rs            # CLI entry
│   ├── execution_request/ # Core bundling logic
│   └── run_js.rs          # deno_core execution
├── tests/
│   ├── cli.test.ts        # E2E tests (vitest)
│   ├── fixtures/          # Test input files
│   └── vitest.config.ts
├── docs/                   # Design documents
├── TASKS.md               # Current work tracking
├── PLAYBOOK.md            # This file
└── *.DESIGN.md            # Feature designs
```

## Workflow for New Features

1. **Design** (if complex)
   - Create `FEATURE_DESIGN.md`
   - Describe the approach
   - Get feedback before implementing

2. **Test First**
   - Add failing test to `tests/cli.test.ts`
   - Create fixture in `tests/fixtures/`
   - Run `cd tests && npm test` - should fail

3. **Implement**
   - Make changes to Rust code in `src/`
   - Run `cargo build --release`
   - Run tests again - should pass

4. **Document**
   - Update TASKS.md
   - Add comments to complex code
   - Update PLAYBOOK.md if new patterns emerge

5. **Commit**
   - Clear commit message
   - Include test + implementation together
   - Push to offload remote

## Running Tests

```bash
# Rust unit tests
cargo test

# E2E tests
cd tests && npm test

# Build release
cargo build --release

# Run single file
./target/release/funee path/to/file.ts

# Emit bundled JS (debug)
./target/release/funee --emit path/to/file.ts
```

## Current Goal

**Port the `everything` repo to funee.**

This means implementing the macro system so code like this works:
```typescript
import { closure, Closure } from "funee";

const add = (a: number, b: number) => a + b;
const addClosure: Closure<typeof add> = closure(add);
// addClosure.expression is the AST of the arrow function
```

## Reference Code

- `~/clawd/agents/riff/repos/everything/` - Original Opah implementation
- `everything/macros/` - Macro definitions
- `everything/opah/executeExpressionWithScope/` - How Opah processes macros

## Questions?

Report to #funee Slack channel. Tag @Netanel if stuck.
