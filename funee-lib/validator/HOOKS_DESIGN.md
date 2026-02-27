# Funee Test Hooks Design

## Problem Statement

Funee runs functions, not files. Traditional test hooks like `beforeAll`/`afterAll` are file-scoped concepts that don't fit funee's function-centric paradigm.

We need a setup/teardown mechanism that:
1. Works at the function/scenario level
2. Integrates with watch mode (closure reference tracking)
3. Maintains funee's compositional, declarative style
4. Guarantees cleanup even on test failures

## Current Architecture Context

```typescript
type Scenario = {
  description: string;
  focus?: true;
  verify: Closure<() => Promise<unknown>>;
};

type Closure<T> = {
  expression: T;
  references: Map<string, CanonicalName>;  // Used by watch mode!
};
```

Watch mode relies on `verify.references` to track which files affect which scenarios. Any hooks solution must preserve this capability.

---

## Option Analysis

### Option 1: Scenario-level Setup/Teardown

```typescript
scenario({
  description: "test with setup",
  setup: async () => { /* runs before verify */ },
  teardown: async () => { /* runs after verify, even on failure */ },
  verify: closure(() => async () => { ... }),
});
```

**Pros:**
- ✅ Simple and explicit
- ✅ Each scenario is self-contained
- ✅ Natural extension of existing API
- ✅ Clear execution order

**Cons:**
- ❌ No sharing between scenarios
- ❌ Duplicate setup/teardown code for related tests
- ❌ Setup/teardown functions aren't closures → **breaks watch mode**
- ❌ How does teardown access state created by setup?

**Watch Mode Issue:** If setup creates a server, verify uses it, and teardown closes it - but only verify is a Closure. Changes to the setup code won't trigger re-runs.

**Verdict:** Too limited. Doesn't enable sharing or proper watch mode support.

---

### Option 2: Scenario Groups with Shared Setup

```typescript
const serverScenarios = scenarioGroup({
  setup: async () => { return startServer(); },
  teardown: async (server) => { server.shutdown(); },
  scenarios: [
    scenario({ description: "test 1", verify: closure(() => async (server) => { ... }) }),
    scenario({ description: "test 2", verify: closure(() => async (server) => { ... }) }),
  ],
});
```

**Pros:**
- ✅ Enables sharing resources between scenarios
- ✅ Clear scoping of resources
- ✅ Familiar from other frameworks (describe blocks)

**Cons:**
- ❌ Introduces file-level thinking (groups are mini-files)
- ❌ Setup/teardown still aren't closures → watch mode breaks
- ❌ What happens when one scenario in a group changes in watch mode?
  - Re-run just that scenario? Need to redo setup.
  - Re-run all? Wasteful.
- ❌ Complex lifecycle management (per-scenario vs per-group setup)
- ❌ Verify function signature changes (receives injected state)

**Watch Mode Complexity:** If test 1 changes, do we:
- Re-run setup + test 1 + teardown?
- Re-run setup + test 1 + test 2 + teardown?
- What if setup code changes? Must re-run all.

**Verdict:** Reintroduces file-level thinking. Lifecycle complexity is high.

---

### Option 3: Resource Pattern (Wrapper Functions)

```typescript
const withServer = async (fn: (server: Server) => Promise<void>) => {
  const server = await startServer();
  try { await fn(server); }
  finally { server.shutdown(); }
};

scenario({
  description: "test with server",
  verify: closure(() => async () => {
    await withServer(async (server) => {
      await assertThat(server.status, is("running"));
    });
  }),
});
```

**Pros:**
- ✅ Pure functions, no framework magic
- ✅ Composable: `await withServer(async (s) => await withDb(async (db) => { ... }))`
- ✅ Verify remains a closure → watch mode works!
- ✅ Standard JavaScript pattern (Rust's Drop, Python's context managers)
- ✅ No changes needed to scenario API
- ✅ Easy to understand and debug

**Cons:**
- ❌ Nesting gets deep with multiple resources
- ❌ Verbose for simple cases
- ❌ Resource helpers need to be written by users

**Watch Mode:** Works perfectly! The entire test including setup/teardown is inside the closure. Changes to `withServer` (via its import) trigger re-runs.

**Verdict:** Elegant and composable, but nesting can be awkward.

---

### Option 4: Fixture Pattern

```typescript
const serverFixture = defineFixture({
  create: async () => startServer(),
  destroy: async (server) => server.shutdown(),
});

scenario({
  description: "test with server",
  fixtures: [serverFixture],
  verify: closure(() => async (server) => { ... }),
});
```

**Pros:**
- ✅ Clean declarative API
- ✅ No nesting issues
- ✅ Fixtures can be shared and composed
- ✅ Familiar from pytest

**Cons:**
- ❌ Adds framework complexity
- ❌ Magic injection into verify function
- ❌ How does verify closure know its parameter types?
- ❌ Fixture creation isn't in the closure → watch mode breaks
- ❌ Multiple fixtures → ordering? Dependency injection?

**Watch Mode Issue:** `fixtures: [serverFixture]` references the fixture, but the fixture's `create` function isn't part of the verify closure. Changes to fixture code won't trigger re-runs.

**Type Safety Issue:** How do we type `verify: closure(() => async (server) => ...)`? The parameter type must match the fixture output, but there's no type connection.

**Verdict:** Framework magic creates complexity without clear benefits over Option 3.

---

## Recommendation: Option 3 (Resource Pattern)

The resource/wrapper pattern is the best fit for funee's paradigm:

1. **Function-centric:** Everything is just functions
2. **Watch mode compatible:** Setup/teardown code is inside the closure
3. **Composable:** Standard function composition
4. **No framework magic:** Users write and understand the code
5. **Type-safe:** Standard TypeScript inference

### Addressing the Nesting Problem

For deep nesting, provide a helper to flatten:

```typescript
// Compose multiple resources into one
const withResources = async <A, B, C>(
  resourceA: (fn: (a: A) => Promise<void>) => Promise<void>,
  resourceB: (fn: (b: B) => Promise<void>) => Promise<void>,
  fn: (a: A, b: B) => Promise<void>
): Promise<void> => {
  await resourceA(async (a) => {
    await resourceB(async (b) => {
      await fn(a, b);
    });
  });
};

// Usage
scenario({
  description: "test with multiple resources",
  verify: closure(() => async () => {
    await withResources(withServer, withDatabase, async (server, db) => {
      // Both server and db available, flat
    });
  }),
});
```

Or a builder pattern:

```typescript
const using = <A>(r: Resource<A>) => ({
  and: <B>(r2: Resource<B>) => ({
    do: (fn: (a: A, b: B) => Promise<void>) =>
      r(async (a) => r2(async (b) => fn(a, b))),
  }),
  do: (fn: (a: A) => Promise<void>) => r(fn),
});

// Usage
await using(withServer).and(withDatabase).do(async (server, db) => {
  // Clean!
});
```

---

## Recommended API

### Core: Resource Helper Pattern

```typescript
// Type for resource wrappers
type Resource<T> = (fn: (resource: T) => Promise<void>) => Promise<void>;

// Users define their own resource wrappers
const withServer: Resource<Server> = async (fn) => {
  const server = await startServer();
  try { await fn(server); }
  finally { await server.shutdown(); }
};

const withDatabase: Resource<Database> = async (fn) => {
  const db = await connectDb();
  try { await fn(db); }
  finally { await db.close(); }
};
```

### Helper: `defineResource` (Optional Convenience)

```typescript
// Funee provides a helper to reduce boilerplate
const defineResource = <T>(config: {
  create: () => Promise<T>,
  destroy: (resource: T) => Promise<void>,
}): Resource<T> => async (fn) => {
  const resource = await config.create();
  try { await fn(resource); }
  finally { await config.destroy(resource); }
};

// Usage
const withServer = defineResource({
  create: () => startServer(),
  destroy: (s) => s.shutdown(),
});
```

### Helper: `using` (Compose Resources)

```typescript
// Flatten nested resources
const using = <A>(resource: Resource<A>) => ({
  and: <B>(resource2: Resource<B>) => using2(resource, resource2),
  run: (fn: (a: A) => Promise<void>) => resource(fn),
});

const using2 = <A, B>(r1: Resource<A>, r2: Resource<B>) => ({
  and: <C>(r3: Resource<C>) => using3(r1, r2, r3),
  run: (fn: (a: A, b: B) => Promise<void>) =>
    r1(async (a) => r2(async (b) => fn(a, b))),
});

// And so on for using3, using4... (or use variadic types)

// Usage in scenarios
scenario({
  description: "test with server and db",
  verify: closure(() => async () => {
    await using(withServer)
      .and(withDatabase)
      .run(async (server, db) => {
        await assertThat(server.status, is("running"));
        await assertThat(db.isConnected, is(true));
      });
  }),
});
```

---

## Integration with runScenarios

**No changes needed!** The resource pattern works entirely within the verify closure:

```typescript
// runScenarios.ts stays the same
const verifyFn = scenario.verify.expression;
await verifyFn();  // Resources are created/destroyed inside this call
```

The resource lifecycle is completely managed by the verify function itself.

---

## Integration with Watch Mode

**Works automatically!** Resources referenced inside the closure are tracked:

```typescript
// withServer.ts
export const withServer: Resource<Server> = defineResource({
  create: () => startServer(),  // startServer is a reference
  destroy: (s) => s.shutdown(),
});

// test.ts
scenario({
  description: "server test",
  verify: closure(() => async () => {
    await withServer(async (server) => { ... });  // withServer is tracked!
  }),
});
```

When `withServer.ts` changes, the closure's references include it → scenario re-runs.

**Reference tracking:**
```
scenario.verify.references = Map {
  "withServer" → { uri: "/path/to/withServer.ts", name: "withServer" },
  "assertThat" → { uri: "funee", name: "assertThat" },
  ...
}
```

---

## Examples

### Simple Case: Single Resource

```typescript
import { scenario, closure, assertThat, is, defineResource } from "funee";

const withTempDir = defineResource({
  create: async () => {
    const dir = await Deno.makeTempDir();
    return dir;
  },
  destroy: async (dir) => {
    await Deno.remove(dir, { recursive: true });
  },
});

export default scenario({
  description: "creates files in temp directory",
  verify: closure(() => async () => {
    await withTempDir(async (dir) => {
      await Deno.writeTextFile(`${dir}/test.txt`, "hello");
      const content = await Deno.readTextFile(`${dir}/test.txt`);
      await assertThat(content, is("hello"));
    });
  }),
});
```

### Complex Case: Multiple Resources

```typescript
import { scenario, closure, assertThat, is, using } from "funee";
import { withServer, withDatabase, withRedis } from "./resources.ts";

export default scenario({
  description: "integration test with full stack",
  verify: closure(() => async () => {
    await using(withServer)
      .and(withDatabase)
      .and(withRedis)
      .run(async (server, db, redis) => {
        // All resources available, guaranteed cleanup
        const user = await db.createUser({ name: "test" });
        await redis.set(`user:${user.id}`, JSON.stringify(user));
        
        const response = await fetch(`${server.url}/users/${user.id}`);
        await assertThat(response.status, is(200));
      });
  }),
});
```

### Reusable Test Context

```typescript
// testContext.ts
import { defineResource, using } from "funee";
import { withServer, withDatabase } from "./resources.ts";

// Pre-composed resource for common test setup
export const withTestContext = defineResource({
  create: async () => {
    let server: Server;
    let db: Database;
    
    await using(withServer).and(withDatabase).run(async (s, d) => {
      server = s;
      db = d;
      // Don't return - we'll manage lifecycle manually
    });
    
    // Actually, better pattern:
    const _db = await connectDb();
    const _server = await startServer({ db: _db });
    return { server: _server, db: _db };
  },
  destroy: async ({ server, db }) => {
    await server.shutdown();
    await db.close();
  },
});

// test.ts
scenario({
  description: "user flow test",
  verify: closure(() => async () => {
    await withTestContext(async ({ server, db }) => {
      // Full test context available
    });
  }),
});
```

---

## What NOT to Build

### ❌ Scenario Groups

Don't add `scenarioGroup`. It reintroduces file-level thinking and complicates watch mode.

### ❌ Global Fixtures

Don't add global/singleton resources. They create hidden state and test interdependencies.

### ❌ Implicit Injection

Don't inject resources into verify automatically. Keep everything explicit and traceable.

### ❌ beforeAll/afterAll

Don't add file-level hooks. They don't fit funee's model.

---

## Implementation Plan

1. **Add `Resource<T>` type** to `funee-lib/validator/index.ts`
2. **Add `defineResource` helper** - optional convenience for creating resources
3. **Add `using` helper** - for composing multiple resources without nesting
4. **Document patterns** in README/examples
5. **No changes to `runScenarios` or `runScenariosWatch`** - they work as-is

---

## Summary

The resource pattern (Option 3) is the funee-native solution:

| Aspect | Solution |
|--------|----------|
| Setup/Teardown | Wrapper functions with try/finally |
| Multiple Resources | `using(a).and(b).run(...)` |
| Watch Mode | References tracked in closure |
| Type Safety | Full inference, no magic |
| Complexity | None added to runner |

This approach embodies funee's philosophy: **functions all the way down**.
