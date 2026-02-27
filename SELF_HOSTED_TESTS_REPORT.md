# Self-Hosted Tests Report: Migrating Funee Tests to Funee

## Overview

This report analyzes the feasibility and approach for migrating funee's test suite from vitest to funee itself (self-hosted tests). The goal is to dogfood funee's testing capabilities and reduce external dependencies.

---

## A. Current Test Suite Overview

### Test Statistics
- **Total Tests**: 154 `it()` test cases
- **Describe Blocks**: 33 `describe()` blocks
- **Main Test File**: `tests/cli.test.ts` (~3,600 lines)
- **Test Fixtures**: ~100+ fixture files in `tests/fixtures/`
- **Helper Server**: `tests/helpers/testServer.ts` (HTTP mock server)

### Test Categories

| Category | Tests | Description |
|----------|-------|-------------|
| Basic Execution | 4 | Simple function execution, async, multi-host |
| Re-exports | 2 | Barrel files, aliased re-exports |
| Import Chains | 1 | Deep import resolution (A → B → C) |
| Import Aliasing | 1 | `import { foo as bar }` pattern |
| Private Helpers | 2 | Non-exported function inclusion, tree-shaking |
| Tree Shaking | 2 | Declaration-level bundling |
| Arrow Functions | 2 | `export const fn = () => {}` pattern |
| Globals | 2 | JavaScript built-ins (Promise, Object, etc.) |
| Macros | 11 | Macro expansion, closure capture, recursion |
| Funee Std Library | ~40 | All funee-lib exports (axax, streams, tar, etc.) |
| HTTP Imports | 14 | Fetching modules from HTTP URLs, caching |
| Assertions | 7 | assertThat, is, not, both, otherwise |
| Error Handling | 2 | Missing imports, parse errors |
| Validator | 4 | scenario/runScenarios pattern |
| HTTP Module | 5 | httpGetJSON, httpPostJSON, getBody |
| Watch Mode | 4 | Closure reference watching |
| Timers | 3 | setTimeout, clearTimeout, setInterval |
| HTTP Server | 19 | serve() API (Request/Response) |
| Fetch API | 8 | Web-standard fetch() |
| Subprocess | 9 | spawn() API |

### Patterns Used

#### 1. beforeAll / afterAll Hooks
```typescript
beforeAll(async () => {
  // Build funee in release mode before tests
  execSync('cargo build --release', { cwd: '...' });
});

afterAll(async () => {
  // Cleanup HTTP servers, temp files
});
```

#### 2. beforeEach for Test Isolation
```typescript
beforeEach(async () => {
  await clearTestCache();
  serverState.requestLog = [];
});
```

#### 3. Helper Functions for Running Funee
```typescript
async function runFunee(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  // Spawns funee binary and captures output
}
```

#### 4. Test Server for HTTP Tests
```typescript
const fetchTestServer = startTestServer(19998);
// Server handles /json, /text, /headers, /post, etc.
```

#### 5. Expect Assertions (Vitest/Jest)
```typescript
expect(exitCode).toBe(0);
expect(stdout).toContain('hello from funee');
expect(stdout).not.toContain('unused');
expect(stderr).toMatch(/parse|error|expected/i);
```

### What Vitest Provides

| Feature | Usage in Test Suite |
|---------|---------------------|
| `describe()` | Nested test grouping (33 blocks) |
| `it()` | Individual test cases (154 tests) |
| `beforeAll` / `afterAll` | Suite-level setup/teardown |
| `beforeEach` | Per-test isolation |
| `expect().toBe()` | Strict equality |
| `expect().toContain()` | String/array containment |
| `expect().toMatch()` | Regex matching |
| `expect().not.X()` | Negation |
| `expect().toBeGreaterThan()` | Numeric comparisons |
| `expect().toBeLessThan()` | Numeric comparisons |
| Automatic test discovery | Finding *.test.ts files |
| Watch mode | Re-run on file changes |
| Timeout configuration | Per-test and suite timeouts |
| Parallel execution | Concurrent test running |
| CLI filtering | `--filter` to run specific tests |
| Error stack traces | Clear failure reporting |

---

## B. What Funee Already Has

### Core Testing Infrastructure

#### Assertions (`funee-lib/assertions/`)
```typescript
import { assertThat, is, not as notAssertion, both, otherwise, AssertionError } from "funee";

// Basic equality
await assertThat(2 + 2, is(4));

// Negation
await assertThat(5, notAssertion(is(10)));

// Combining assertions
await assertThat(value, both(isNumber, isPositive));

// Error context
await assertThat(result, is(expected), otherwise((err) => `Context: ${context}`));

// Direct assertion helpers
assert(condition, "message");
strictEqual(actual, expected);
deepEqual(actual, expected);
```

#### Scenario/Test Runner (`funee-lib/validator/`)
```typescript
import { scenario, runScenarios, runScenariosWatch, Closure } from "funee";

const scenarios = [
  scenario({
    description: "addition works correctly",
    verify: {
      expression: async () => {
        await assertThat(2 + 2, is(4));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  scenario({
    description: "FOCUSED - only this runs",
    focus: true,  // Like it.only()
    verify: { /* ... */ },
  }),
];

// Run once
const results = await runScenarios(scenarios, { logger: log });
// results: Array<{ description, success, error? }>

// Watch mode (re-runs affected tests on file change)
await runScenariosWatch(scenarios, { logger: log });
```

#### Subprocess (`funee-lib/process/`)
```typescript
import { spawn } from "funee";

// Simple form
const result = await spawn("echo", ["hello world"]);
console.log(result.stdoutText());  // "hello world\n"
console.log(result.status.code);   // 0
console.log(result.status.success); // true

// With options
const proc = spawn({
  cmd: ["cat"],
  stdin: "piped",
  stdout: "piped",
  cwd: "/tmp",
  env: { CUSTOM: "value" },
});
await proc.writeInput("hello");
const output = await proc.output();
```

#### HTTP Server (`funee-lib/server/`)
```typescript
import { serve, createResponse, createJsonResponse } from "funee";

const server = serve({
  port: 0,  // Random port
  handler: async (req) => {
    if (req.method === "GET") {
      return createJsonResponse({ message: "hello" });
    }
    return createResponse("Not found", { status: 404 });
  },
  onListen: ({ port }) => log(`Server on port ${port}`),
});

// Later: await server.shutdown();
```

#### HTTP Client (`funee-lib/http/`)
```typescript
import { fetch, httpGetJSON, httpPostJSON, getBody } from "funee";

// Web-standard fetch
const response = await fetch("https://api.example.com/data");
const data = await response.json();

// Convenience functions
const json = await httpGetJSON<ResponseType>(url);
const posted = await httpPostJSON(url, { key: "value" });
const text = await getBody(url);
```

#### File System (`funee-lib/filesystem/`)
```typescript
import { readFile, writeFile, isFile, lstat, readdir, join, tmpdir } from "funee";

await writeFile("/tmp/test.txt", "content");
const content = await readFile("/tmp/test.txt");
const exists = await isFile("/tmp/test.txt");
const stats = await lstat("/tmp/test.txt");  // { size, is_file, is_directory, modified_ms }
const files = await readdir("/tmp");
const path = join("/tmp", "subdir", "file.txt");
const temp = tmpdir();  // "/tmp" or equivalent
```

#### Timers
```typescript
// setTimeout and clearTimeout are available
const id = setTimeout(() => log("fired"), 100);
clearTimeout(id);

// setInterval and clearInterval
const intervalId = setInterval(() => log("tick"), 100);
clearInterval(intervalId);
```

#### Random/Utilities
```typescript
import { cryptoRandomString, someString, someDirectory } from "funee";

const id = cryptoRandomString(16);  // "a1b2c3d4e5f6g7h8"
const random = someString();        // Random 16-char hex
const tempDir = someDirectory();    // "/tmp/funee_abc123"
```

### Example: Funee-Native Test Pattern

```typescript
import { 
  log, scenario, runScenarios, Closure,
  assertThat, is, notAssertion,
  spawn, serve, fetch,
  writeFile, readFile, tmpdir, join
} from "funee";

const scenarios = [
  scenario({
    description: "hello.ts prints hello from funee",
    verify: {
      expression: async () => {
        const result = await spawn("./target/release/funee", ["tests/fixtures/hello.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText().includes("hello from funee"), is(true));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
  
  scenario({
    description: "tree shaking excludes unused declarations",
    verify: {
      expression: async () => {
        const result = await spawn("./target/release/funee", ["--emit", "tests/fixtures/treeshake/entry.ts"]);
        await assertThat(result.status.code, is(0));
        await assertThat(result.stdoutText().includes("used"), is(true));
        await assertThat(result.stdoutText().includes("unused"), is(false));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  await runScenarios(scenarios, { logger: log });
};
```

---

## C. Missing APIs / Gaps

### 1. `describe`/`it` Structure vs `scenario`

**Current State**: Funee has `scenario` which is flat (no nesting).

**What's Missing**: Hierarchical grouping like `describe("category", () => { it("test1", ...); it("test2", ...); })`.

**Why Needed**: 
- Current test suite has 33 nested describe blocks
- Logical grouping helps organization and reporting
- Selective running of test groups

**Suggested Implementation**:
```typescript
// Option A: Keep flat scenarios, use naming conventions
scenario({
  description: "HTTP imports :: basic fetching :: fetches simple module",
  // ...
});

// Option B: Add optional `group` field
scenario({
  group: ["HTTP imports", "basic fetching"],
  description: "fetches simple module",
  // ...
});

// Option C: Create describe() helper that returns scenarios
const httpImportTests = describe("HTTP imports", [
  describe("basic fetching", [
    scenario({ description: "fetches simple module", ... }),
  ]),
]);
```

**Recommendation**: Use naming conventions initially (Option A), as it requires no API changes.

---

### 2. `beforeAll` / `afterAll` Hooks

**Current State**: Not available.

**What's Missing**: Suite-level setup and teardown.

**Why Needed**:
- Build funee binary before tests (cargo build)
- Start test HTTP servers
- Clean up temp files after all tests

**Suggested Implementation**:
```typescript
// Add to runScenarios options
await runScenarios(scenarios, {
  logger: log,
  beforeAll: async () => {
    await spawn("cargo", ["build", "--release"], { cwd: ".." });
  },
  afterAll: async () => {
    await cleanupTempFiles();
  },
});
```

**Workaround**: Run setup in the `export default` function before `runScenarios()`.

---

### 3. `beforeEach` / `afterEach` Hooks

**Current State**: Not available.

**What's Missing**: Per-test setup and teardown.

**Why Needed**:
- Clear test cache between HTTP tests
- Reset server state
- Create fresh temp directories per test

**Suggested Implementation**:
```typescript
await runScenarios(scenarios, {
  logger: log,
  beforeEach: async () => {
    await clearTestCache();
  },
  afterEach: async () => {
    await cleanupTestDir();
  },
});
```

**Workaround**: Call setup at the start of each `verify.expression`.

---

### 4. Additional Matchers

**Current State**:
- `is(expected)` - strict equality (===)
- `notAssertion(assertion)` - negation
- `both(a, b)` - combine assertions
- `deepEqual(a, b)` - deep object equality
- `strictEqual(a, b)` - strict equality
- `assert(condition)` - boolean assertion

**What's Missing**:

| Matcher | Usage Count | Priority |
|---------|-------------|----------|
| `toContain()` | 200+ | HIGH |
| `toMatch(regex)` | 15+ | HIGH |
| `toBeGreaterThan()` | 5 | MEDIUM |
| `toBeLessThan()` | 2 | MEDIUM |
| `toHaveLength()` | 0 | LOW |
| `toThrow()` | 0 | LOW |

**Suggested Implementation**:
```typescript
// funee-lib/assertions/contains.ts
export const contains = (expected: string): Assertion<string> => {
  return (actual: string) => {
    if (!actual.includes(expected)) {
      throw AssertionError({
        message: `Expected "${actual}" to contain "${expected}"`,
        actual,
        expected,
        operator: "contains",
      });
    }
  };
};

// funee-lib/assertions/matches.ts
export const matches = (pattern: RegExp): Assertion<string> => {
  return (actual: string) => {
    if (!pattern.test(actual)) {
      throw AssertionError({
        message: `Expected "${actual}" to match ${pattern}`,
        actual,
        expected: pattern.toString(),
        operator: "matches",
      });
    }
  };
};

// funee-lib/assertions/greaterThan.ts
export const greaterThan = (expected: number): Assertion<number> => {
  return (actual: number) => {
    if (actual <= expected) {
      throw AssertionError({
        message: `Expected ${actual} to be greater than ${expected}`,
        actual,
        expected,
        operator: "greaterThan",
      });
    }
  };
};

// Also: lessThan, hasLength, throws
```

---

### 5. Test Timeouts

**Current State**: No built-in timeout support.

**What's Missing**: Per-test and suite-level timeouts.

**Why Needed**:
- Some tests have `}, 60000); // 60 second timeout`
- Network tests need longer timeouts
- Prevents hanging tests

**Suggested Implementation**:
```typescript
// Per-scenario timeout
scenario({
  description: "slow test",
  timeout: 60000,  // 60 seconds
  verify: { /* ... */ },
});

// Suite-level default
await runScenarios(scenarios, {
  logger: log,
  timeout: 30000,  // 30 second default
});
```

**Implementation Approach**: Wrap `verify.expression()` call with `Promise.race()` against a timeout promise.

---

### 6. Parallel Test Execution

**Current State**: `runScenarios` has a `concurrency` option but runs sequentially in practice.

**What's Missing**: True parallel execution.

**Why Needed**: Faster test runs (154 tests).

**Suggested Implementation**:
```typescript
// Current sequential implementation should be updated
// to use Promise pools with configurable concurrency
const runScenariosParallel = async (scenarios, { concurrency = 10 }) => {
  const pool = [];
  for (const scenario of scenarios) {
    if (pool.length >= concurrency) {
      await Promise.race(pool);
      // Remove completed promises
    }
    pool.push(runSingleScenario(scenario));
  }
  await Promise.all(pool);
};
```

---

### 7. Test Filtering (Run Specific Tests)

**Current State**: `focus: true` on individual scenarios.

**What's Missing**: CLI-based filtering.

**Why Needed**:
- Run subset of tests during development
- CI matrix splitting

**Suggested Implementation**:
```typescript
// CLI: funee tests/cli-tests.ts --filter "HTTP imports"
// Or env var: FUNEE_TEST_FILTER="HTTP imports"

await runScenarios(scenarios, {
  logger: log,
  filter: process.env.FUNEE_TEST_FILTER,  // or cli arg
});
```

---

### 8. Mocking / Spying

**Current State**: Not available.

**What's Missing**: Mock functions, spies, module mocking.

**Why Needed**:
- Mock HTTP responses
- Spy on function calls
- Control test determinism

**Assessment**: LOW PRIORITY for migration. Most tests use real fixtures and spawned processes, not mocks.

**Workaround**: Use the real test HTTP server (`testServer.ts`) which is already portable.

---

### 9. Snapshot Testing

**Current State**: Not available.

**What's Missing**: `expect(output).toMatchSnapshot()`.

**Assessment**: NOT USED in current test suite. LOW PRIORITY.

---

### 10. Code Coverage

**Current State**: Not available.

**What's Missing**: Test coverage reporting.

**Assessment**: NICE TO HAVE. Low priority for initial migration.

---

## D. Migration Strategy

### Phase 1: Infrastructure (Week 1)

1. **Add missing matchers** to `funee-lib/assertions/`:
   - `contains(expected: string)`
   - `matches(pattern: RegExp)`
   - `greaterThan(n: number)` / `lessThan(n: number)`

2. **Add beforeAll/afterAll/beforeEach/afterEach** to `runScenarios` options

3. **Add timeout support** to scenarios

4. **Port test server** from `tests/helpers/testServer.ts` to a funee fixture

### Phase 2: Migrate Core Tests (Week 2)

Start with the simplest, most isolated tests:

1. **Basic execution tests** (4 tests)
   - hello.ts, default-expr.ts, multi-host.ts, async.ts
   
2. **Tree shaking tests** (2 tests)
   - Clear input/output patterns

3. **Globals tests** (2 tests)
   - Self-contained

4. **Error handling tests** (2 tests)
   - Testing error conditions

### Phase 3: Migrate Standard Library Tests (Week 3)

These test funee-lib features using funee:

1. **Assertions tests** (7 tests)
2. **Validator tests** (4 tests)
3. **Filesystem tests** (~5 tests)
4. **Streams/axax tests** (~15 tests)

### Phase 4: Migrate Complex Tests (Week 4)

1. **HTTP import tests** (14 tests)
   - Requires test server migration
   
2. **HTTP server tests** (19 tests)
   - Test serve() using fetch()

3. **Fetch API tests** (8 tests)
   - Depends on test server

4. **Subprocess tests** (9 tests)
   - Meta: spawn testing spawn

### Phase 5: Migrate Remaining Tests (Week 5)

1. **Macro tests** (11 tests)
2. **Watch mode tests** (4 tests)
3. **Timer tests** (3 tests)
4. **Re-exports / Import chain tests** (4 tests)

### Running Both Suites During Transition

```bash
# Run vitest (original)
npm test

# Run self-hosted tests
./target/release/funee tests/self-hosted/run-all.ts

# CI configuration
jobs:
  test:
    steps:
      - run: npm test                                    # Vitest
      - run: ./target/release/funee tests/self-hosted/  # Self-hosted
```

### Directory Structure

```
tests/
├── cli.test.ts              # Original vitest tests (keep during transition)
├── helpers/
│   └── testServer.ts        # Original test server
├── fixtures/                # Original fixtures (reuse)
└── self-hosted/
    ├── run-all.ts           # Entry point for self-hosted tests
    ├── test-server.ts       # Funee-native test server
    ├── basic/
    │   └── execution.ts
    ├── tree-shaking/
    │   └── tree-shake.ts
    ├── http/
    │   └── imports.ts
    └── ...
```

---

## E. Example Conversions

### Example 1: Basic Execution Test

**Original (vitest)**:
```typescript
describe('basic execution', () => {
  it('runs a simple function that calls log', async () => {
    const { stdout, exitCode } = await runFunee(['hello.ts']);
    
    expect(exitCode).toBe(0);
    expect(stdout).toContain('hello from funee');
  });
});
```

**Converted (funee)**:
```typescript
import { log, scenario, runScenarios, Closure, assertThat, is, spawn } from "funee";

const FUNEE_BIN = "./target/release/funee";
const FIXTURES = "./tests/fixtures";

// Helper to run funee CLI
const runFunee = async (args: string[]) => {
  const result = await spawn(FUNEE_BIN, args, { cwd: FIXTURES });
  return {
    stdout: result.stdoutText(),
    stderr: result.stderrText(),
    exitCode: result.status.code,
  };
};

// String contains assertion (add to funee-lib)
const contains = (expected: string) => (actual: string) => {
  if (!actual.includes(expected)) {
    throw new Error(`Expected "${actual}" to contain "${expected}"`);
  }
};

const scenarios = [
  scenario({
    description: "basic execution :: runs a simple function that calls log",
    verify: {
      expression: async () => {
        const { stdout, exitCode } = await runFunee(["hello.ts"]);
        
        await assertThat(exitCode, is(0));
        await assertThat(stdout, contains("hello from funee"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  await runScenarios(scenarios, { logger: log });
};
```

### Example 2: Tree Shaking Test with --emit

**Original (vitest)**:
```typescript
describe('tree shaking', () => {
  it('emitted code does not contain unused declarations', async () => {
    const { stdout, exitCode } = await runFuneeEmit(['treeshake/entry.ts']);
    
    expect(exitCode).toBe(0);
    expect(stdout).toContain('used');
    expect(stdout).not.toContain('unused');
    expect(stdout).not.toContain('alsoUnused');
  });
});
```

**Converted (funee)**:
```typescript
import { log, scenario, runScenarios, Closure, assertThat, is, notAssertion, spawn } from "funee";

const runFuneeEmit = async (args: string[]) => {
  const result = await spawn("./target/release/funee", ["--emit", ...args], { 
    cwd: "./tests/fixtures" 
  });
  return {
    stdout: result.stdoutText(),
    exitCode: result.status.code,
  };
};

const contains = (expected: string) => (actual: string) => {
  if (!actual.includes(expected)) {
    throw new Error(`Expected to contain "${expected}"`);
  }
};

const doesNotContain = (expected: string) => (actual: string) => {
  if (actual.includes(expected)) {
    throw new Error(`Expected NOT to contain "${expected}"`);
  }
};

const scenarios = [
  scenario({
    description: "tree shaking :: emitted code does not contain unused declarations",
    verify: {
      expression: async () => {
        const { stdout, exitCode } = await runFuneeEmit(["treeshake/entry.ts"]);
        
        await assertThat(exitCode, is(0));
        await assertThat(stdout, contains("used"));
        await assertThat(stdout, doesNotContain("unused"));
        await assertThat(stdout, doesNotContain("alsoUnused"));
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  await runScenarios(scenarios, { logger: log });
};
```

### Example 3: HTTP Server Test

**Original (vitest)**:
```typescript
describe('HTTP server', () => {
  it('basic server starts and responds to requests', async () => {
    const { stdout, exitCode } = await runFunee(['server/basic-server.ts']);
    
    expect(exitCode).toBe(0);
    expect(stdout).toContain('server has port: true');
    expect(stdout).toContain('response ok: true');
    expect(stdout).toContain('shutdown complete: true');
  });
});
```

**Converted (funee)**:
```typescript
import { 
  log, scenario, runScenarios, Closure, 
  assertThat, is, 
  serve, fetch, createResponse 
} from "funee";

// Helper assertions
const isTrue = is(true);
const contains = (expected: string) => (actual: string) => {
  if (!actual.includes(expected)) throw new Error(`Missing: ${expected}`);
};

const scenarios = [
  scenario({
    description: "HTTP server :: basic server starts and responds to requests",
    verify: {
      expression: async () => {
        // Start server
        const server = serve({
          port: 0,
          handler: async () => createResponse("hello"),
        });
        
        await assertThat(typeof server.port, is("number"));
        await assertThat(server.port > 0, isTrue);
        await assertThat(typeof server.hostname, is("string"));
        await assertThat(typeof server.shutdown, is("function"));
        
        // Make request
        const response = await fetch(`http://localhost:${server.port}/`);
        await assertThat(response.ok, isTrue);
        await assertThat(response.status, is(200));
        
        const body = await response.text();
        await assertThat(body, is("hello"));
        
        // Shutdown
        await server.shutdown();
        log("basic-server test complete");
      },
      references: new Map(),
    } as Closure<() => Promise<unknown>>,
  }),
];

export default async () => {
  await runScenarios(scenarios, { logger: log });
};
```

---

## F. Summary

### Feasibility: HIGH ✅

Funee already provides ~80% of what's needed for self-hosted tests:
- ✅ Assertion library (assertThat, is, not, both)
- ✅ Test runner (scenario, runScenarios, runScenariosWatch)
- ✅ Subprocess (spawn)
- ✅ HTTP server (serve)
- ✅ HTTP client (fetch)
- ✅ File system (read, write, temp dirs)
- ✅ Timers (setTimeout, setInterval)

### Required Additions

| Feature | Effort | Priority |
|---------|--------|----------|
| `contains()` matcher | 1 hour | HIGH |
| `matches(regex)` matcher | 1 hour | HIGH |
| `greaterThan/lessThan` matchers | 1 hour | MEDIUM |
| beforeAll/afterAll hooks | 2 hours | HIGH |
| beforeEach/afterEach hooks | 2 hours | MEDIUM |
| Timeout support | 2 hours | MEDIUM |
| Test filtering | 2 hours | LOW |

### Estimated Migration Timeline

- **Week 1**: Add missing matchers and hooks
- **Week 2**: Migrate 50 simple tests
- **Week 3**: Migrate 50 library tests
- **Week 4**: Migrate 30 HTTP/server tests
- **Week 5**: Migrate remaining 24 tests, remove vitest

### Benefits of Self-Hosted Tests

1. **Dogfooding**: Tests exercise funee's own capabilities
2. **Fewer dependencies**: Remove vitest, @vitest/coverage-v8
3. **Single runtime**: Everything runs on funee
4. **Smaller install**: No node_modules for testing
5. **Faster CI**: No npm install for test deps
6. **Proof of concept**: Demonstrates funee's testing capabilities
