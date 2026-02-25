# Porting Plan: `everything` → `funee`

**Goal:** Port the concepts and modules from the `everything` repo to work with funee's Rust-based TypeScript bundler.

**Date:** 2025-02-25

---

## Executive Summary

The `everything` repo is a comprehensive TypeScript ecosystem built around Opah's compile-time macro system. It contains:
- **Core macro system** (7 macros)
- **Runtime infrastructure** (opah, opahsh, validator)
- **Utility libraries** (~15 modules with 50+ functions)
- **Dependencies** on `@opah/core`, `@opah/host`, `@opah/immutable`

**Key Insight:** Funee already has the core macro system working (Steps 1-2 complete, Step 3 in progress). The porting effort is primarily about:
1. Expanding `funee-lib` to provide `@opah/core`-equivalent functionality
2. Porting the macro definitions from `everything/macros/`
3. Porting utility libraries (most require no macros)

---

## Dependency Graph

```
                    ┌─────────────────────────────────────┐
                    │         funee-lib (core)            │
                    │  Closure, CanonicalName, createMacro │
                    │  AST builders, AST predicates       │
                    │  getOutOfScopeReferences            │
                    └───────────────┬─────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            │                       │                       │
            ▼                       ▼                       ▼
    ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
    │    macros/    │      │   functions/  │      │   axax/       │
    │ closure       │      │ curry         │      │ map           │
    │ definition    │      │ not           │      │ reduce        │
    │ toAST         │      │               │      │ fromArray     │
    │ canonicalName │      └───────────────┘      │ toArray       │
    │ tuple         │                             │ merge         │
    │ unsafeCast    │                             │ subject       │
    └───────┬───────┘                             │ ...           │
            │                                     └───────────────┘
            │                                             │
    ┌───────┴──────────────────────────────────┐          │
    │                                          │          │
    ▼                                          ▼          ▼
┌───────────────┐                      ┌───────────────────────────┐
│  assertions/  │                      │       collections/        │
│ assertThat    │◄─────────────────────│       without             │
│ is, not, both │                      └───────────────────────────┘
└───────────────┘
        │
        ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  validator/   │      │   refine/     │      │  filesystem/  │
│ scenario      │      │ Refine        │      │ readFile      │
│ runScenarios  │      │ ensure        │      │ writeFile     │
└───────────────┘      │ encode        │      │ isFile        │
                       └───────────────┘      └───────────────┘
                               │
                               ▼
                       ┌───────────────┐      ┌───────────────┐
                       │    http/      │      │    streams/   │
                       │ httpRequest   │      │ readToString  │
                       │ httpGetJSON   │      │ stringToRead  │
                       └───────────────┘      └───────────────┘
```

---

## Module Analysis

### Tier 1: Core Library (`funee-lib` expansion)

These are not "ported" but rather **implemented in funee-lib** to provide the foundation.

| Module | Source | Description | Complexity | Priority |
|--------|--------|-------------|------------|----------|
| AST Builders | `@opah/core` | `arrayExpression`, `callExpression`, `identifier`, `stringLiteral`, `objectExpression`, `objectProperty`, `arrowFunctionExpression`, `variableDeclaration`, `variableDeclarator`, etc. | HIGH | P0 |
| AST Predicates | `@opah/core` | `isIdentifier`, `isCallExpression`, `isArrowFunctionExpression`, etc. | MEDIUM | P0 |
| AST Types | `@opah/core` | `Expression`, `Statement`, `Identifier`, `CallExpression`, etc. | HIGH | P0 |
| `getOutOfScopeReferences` | `@opah/core` | Analyze expression to find external references | HIGH | P0 |
| `replaceNodesByType` | `@opah/core` | Walk AST and replace nodes of specific type | HIGH | P1 |
| Immutable Map | `@opah/immutable` | Use native `Map` or port subset | LOW | P0 |

**Effort:** ~2-3 weeks

### Tier 2: Macro Definitions (`everything/macros/`)

| Macro | File | What It Does | Dependencies | Complexity |
|-------|------|--------------|--------------|------------|
| `toAST` | `toAST.ts` | Converts JS values to AST nodes | AST builders | LOW |
| `closure` | `closure.ts` | Captures expression as `Closure<Closure<T>>` | `toAST`, `Closure`, `CanonicalName`, `Map` | MEDIUM |
| `definition` | `definition.ts` | Captures expression as `Definition` | `toAST`, `Definition`, `CanonicalName`, `Map` | MEDIUM |
| `canonicalName` | `canonicalName.ts` | Gets `CanonicalName` for a reference | `toAST`, `Identifier` | LOW |
| `tuple` | `tuple.ts` | Creates tuple from multiple closures | `arrayExpression`, `Closure` | LOW |
| `unsafeCast` | `unsafeCast.ts` | Type cast without runtime check | None (pure types) | TRIVIAL |
| `unsafeDefined` | `unsafeDefined.ts` | Assert defined without check | None (pure types) | TRIVIAL |

**Effort:** ~1 week (after Tier 1 complete)

### Tier 3: Utility Libraries (No Macro Dependencies)

These can be ported directly - they're plain TypeScript.

| Module | Files | Description | Node.js Deps | Complexity |
|--------|-------|-------------|--------------|------------|
| `functions/` | `curry.ts`, `not.ts` | FP utilities | None | TRIVIAL |
| `collections/` | `without.ts` | Array utilities | None | TRIVIAL |
| `axax/` | 15 files | Async iterator library | None | LOW |
| `random/` | `cryptoRandomString.ts` | Random string generation | `crypto` | TRIVIAL |
| `memoize/` | `memoizeInFS.ts` | FS-based memoization | `fs` | LOW |
| `refine/` | `Refine.ts`, `ensure.ts`, `encode.ts` | Type refinement | None | LOW |
| `withCache.ts` | single file | In-memory caching | `@opah/immutable` → native Map | TRIVIAL |

**Effort:** ~3-5 days

### Tier 4: Testing Infrastructure

| Module | Files | Description | Dependencies | Complexity |
|--------|-------|-------------|--------------|------------|
| `assertions/` | 7 files | `assertThat`, `is`, `not`, `both`, `willStream`, `collectWhileMatches` | `util.types` | MEDIUM |
| `validator/` | 6 files | `scenario`, `runScenarios`, `watchScenario`, specs | `Closure` (macro), assertions | MEDIUM |

**Note:** `validator/scenario.ts` uses `Closure<() => Promise<unknown>>` - requires macro system.

**Effort:** ~1 week

### Tier 5: I/O Libraries

| Module | Files | Description | Node.js Deps | Complexity |
|--------|-------|-------------|--------------|------------|
| `filesystem/` | 6 files | `readFile`, `writeFile`, `isFile`, `lstat`, `readdir`, `PathString` | `fs`, `path` | LOW |
| `streams/` | 6 files | `readStreamToString`, `stringToReadable`, `emptyReadable`, etc. | `stream` | LOW |
| `http/` | 6 files | `httpRequest`, `httpGetJSON`, `httpPostJSON`, `Hostname`, `HttpTarget` | `http` | MEDIUM |
| `watcher/` | 1 file | `watchFileEmitter` | `fs.watch` | LOW |

**Effort:** ~1 week

### Tier 6: Domain-Specific (Lower Priority)

| Module | Description | Dependencies | Complexity |
|--------|-------------|--------------|------------|
| `tar/` | Tar archive create/extract | `fs`, `path`, `crypto` | MEDIUM |
| `git/` | Git ref parsing | None | TRIVIAL |
| `github/` | GitHub release creation | `http/` | LOW |
| `npm/` | NPM publishing | `http/`, `tar/` | MEDIUM |
| `abstracts/` | Mock/stub generators | None | TRIVIAL |

**Effort:** As needed

### Tier 7: Runtime Infrastructure (May Not Be Needed)

| Module | Description | Notes |
|--------|-------------|-------|
| `opah/` | Opah runtime (runFile, executeClosureInContext, processMacros, etc.) | Funee handles this in Rust |
| `opahsh/` | Shell integration | Funee may not need this |
| `in_memory_host/` | In-memory host for testing | May port for testing |
| `replaceDefinitions/` | Definition replacement utilities | May be needed for advanced macros |

**Effort:** TBD based on needs

---

## Phased Implementation Plan

### Phase 1: Foundation (Weeks 1-3)
**Goal:** Complete funee-lib to be feature-equivalent with `@opah/core`

1. **Week 1: AST Types & Builders**
   - [ ] Define TypeScript interfaces for all AST node types
   - [ ] Implement builder functions: `identifier`, `stringLiteral`, `numericLiteral`, `booleanLiteral`, `nullLiteral`
   - [ ] Implement expression builders: `arrayExpression`, `objectExpression`, `objectProperty`
   - [ ] Implement `callExpression`, `memberExpression`, `arrowFunctionExpression`
   - [ ] Implement statement builders: `variableDeclaration`, `variableDeclarator`, `expressionStatement`
   - [ ] Tests for all builders

2. **Week 2: AST Utilities**
   - [ ] Implement AST predicates: `isIdentifier`, `isCallExpression`, etc.
   - [ ] Implement `getOutOfScopeReferences(expression)` - finds all free variables
   - [ ] Implement `replaceNodesByType(node, type, replacer)` - AST transformation
   - [ ] Implement `assertExpression(node)` - type guard
   - [ ] Tests for utilities

3. **Week 3: Integration & Polish**
   - [ ] Ensure funee bundler passes AST nodes in correct format to macros
   - [ ] Verify round-trip: TS source → AST → macro transform → AST → emitted JS
   - [ ] Add `Definition` type (declaration + references)
   - [ ] Documentation

**Deliverable:** `funee-lib` with full AST manipulation capabilities

### Phase 2: Core Macros (Week 4)
**Goal:** Port the 7 macros from `everything/macros/`

1. **Port `toAST.ts`** - Converts values to AST nodes
   - Used by other macros
   - Straightforward implementation

2. **Port `closure.ts`** - The core macro
   - Captures expression as `Closure<Closure<T>>`
   - Returns AST that constructs a Closure at runtime

3. **Port `definition.ts`** - Captures as Definition
   - Similar to closure, but wraps in Definition

4. **Port `canonicalName.ts`** - Gets CanonicalName for reference
   - Looks up reference in closure's references map

5. **Port utility macros**
   - `tuple.ts` - Combines multiple closures
   - `unsafeCast.ts` - Type assertion (no runtime code)
   - `unsafeDefined.ts` - Assert non-null (no runtime code)

**Deliverable:** All macros working with funee

### Phase 3: Utility Libraries (Week 5)
**Goal:** Port non-macro-dependent utilities

1. **Port `functions/`**
   - `curry` - Partial application
   - `not` - Logical negation for predicates

2. **Port `collections/`**
   - `without` - Array difference

3. **Port `axax/`** (async iterators)
   - `fromArray`, `toArray`
   - `map`, `reduce`, `count`
   - `merge`, `subject`
   - `concurrentMap`, `concurrentFilter`
   - `fromEmitter`, `fromNodeStream`
   - `deferred`, `toCallbacks`
   - `collectLength`, `streamUntilLength`

4. **Port `refine/`**
   - `Refine` type
   - `ensure`, `encode`

5. **Port standalone utilities**
   - `withCache.ts`
   - `random/cryptoRandomString.ts`
   - `memoize/memoizeInFS.ts`

**Deliverable:** Utility library ported

### Phase 4: Testing Infrastructure (Week 6)
**Goal:** Port assertions and validator

1. **Port `assertions/`**
   - `Assertion` type, `assertion` helper
   - `assertThat` - Main assertion function
   - `is` - Equality assertion
   - `not` - Negation wrapper
   - `both` - Combine assertions
   - `willStream` - Async stream assertions
   - `collectWhileMatches` - Collect until predicate fails

2. **Port `validator/`**
   - `Scenario` type
   - `scenario` helper
   - `runScenarios` - Execute test scenarios
   - `watchScenario` - Watch mode

**Deliverable:** Test framework operational

### Phase 5: I/O Libraries (Week 7)
**Goal:** Port filesystem, streams, HTTP

1. **Port `filesystem/`**
   - `readFile`, `writeFile`
   - `isFile`, `lstat`, `readdir`
   - `PathString` branded type

2. **Port `streams/`**
   - `readStreamToString`, `readStreamToBuffer`
   - `stringToReadable`, `emptyReadable`
   - `collectLength`, `streamUntilLength`

3. **Port `http/`**
   - `Hostname`, `HttpTarget` types
   - `httpRequest` - Core HTTP function
   - `httpGetJSON`, `httpPostJSON` - Convenience wrappers
   - `getBody` - Response body extraction

**Deliverable:** Full I/O capabilities

### Phase 6: Domain Libraries (Weeks 8+)
**Goal:** Port remaining modules as needed

- `tar/` - Archive handling
- `git/` - Git utilities
- `github/` - GitHub API
- `npm/` - NPM publishing
- `watcher/` - File watching
- `abstracts/` - Mocks/stubs

**Deliverable:** Complete everything port

---

## Funee Features Needed

### Already Implemented ✅
- Macro detection (`createMacro()` pattern)
- Closure capture (expression + references)
- Macro execution via deno_core
- Basic `funee-lib` (Closure, CanonicalName, createMacro)
- HTTP imports (in progress)

### Needed for Phase 1
| Feature | Description | Complexity |
|---------|-------------|------------|
| AST Types in JS | Export AST node interfaces to user code | MEDIUM |
| AST Builders in JS | `identifier()`, `callExpression()`, etc. | HIGH |
| AST from Bundler | Pass AST objects (not strings) to macro functions | MEDIUM |
| `getOutOfScopeReferences` | Analyze expression to find free variables | HIGH |
| `replaceNodesByType` | Transform AST nodes by type | HIGH |

### Needed for Phase 2
| Feature | Description | Complexity |
|---------|-------------|------------|
| `Definition` type | Wrap declaration + references | LOW |
| Artificial definitions | Macros can inject new definitions | MEDIUM |

### Nice to Have (Later Phases)
| Feature | Description | Complexity |
|---------|-------------|------------|
| Import maps | Resolve `@opah/*` style imports | MEDIUM |
| Watch mode | Re-bundle on file changes | MEDIUM |
| Source maps | Debug macro-expanded code | HIGH |

---

## Blockers & Risks

### Blockers
1. **AST Serialization Format** - Need to decide how AST nodes are represented in JS
   - Option A: Match SWC's AST format exactly
   - Option B: Define funee-specific AST format (simpler)
   - **Recommendation:** Start with SWC format for compatibility

2. **Reference Resolution** - Macros need to resolve references to canonical names
   - Funee already has `FuneeIdentifier` - may need to expose as `CanonicalName`

3. **HTTP Imports Completion** - Need HTTP imports working for publishing to esm.sh/deno.land

### Risks
1. **AST Mismatch** - everything uses Babel AST, funee uses SWC AST
   - Mitigation: Create adapter layer or use common subset
   
2. **Node.js APIs** - Many modules use Node.js APIs (`fs`, `http`, `stream`)
   - Mitigation: These are separate from macro system; can use Deno equivalents

3. **Immutable.js Dependency** - everything uses `@opah/immutable` extensively
   - Mitigation: Use native `Map` and port only needed methods

---

## Success Metrics

| Phase | Metric |
|-------|--------|
| Phase 1 | AST builders work in macros, `getOutOfScopeReferences` passes tests |
| Phase 2 | All 7 macros compile and produce correct output |
| Phase 3 | Utility libraries pass their original tests |
| Phase 4 | `runScenarios` successfully executes test scenarios |
| Phase 5 | Read/write files, make HTTP requests via ported modules |
| Phase 6 | Can publish funee packages to npm using ported tools |

---

## Files Reference

### everything/macros/ (7 files)
```
macros/
├── canonicalName.ts   (27 lines) - Get CanonicalName for reference
├── closure.ts         (50 lines) - Capture as Closure<Closure<T>>
├── definition.ts      (58 lines) - Capture as Definition
├── toAST.ts           (32 lines) - Convert values to AST
├── tuple.ts           (17 lines) - Combine closures
├── unsafeCast.ts      (5 lines)  - Type cast
└── unsafeDefined.ts   (5 lines)  - Assert defined
```

### everything/axax/ (15 files)
```
axax/
├── collectLength.ts   - Collect N items from async iterator
├── concurrentFilter.ts - Filter with concurrency
├── concurrentMap.ts   - Map with concurrency
├── count.ts           - Count items
├── deferred.ts        - Deferred promise
├── fromArray.ts       - Array → AsyncIterator
├── fromEmitter.ts     - EventEmitter → AsyncIterator
├── fromNodeStream.ts  - Stream → AsyncIterator
├── map.ts             - Async map
├── merge.ts           - Merge multiple iterators
├── reduce.ts          - Async reduce
├── streamUntilLength.ts - Stream until byte length
├── subject.ts         - Observable-like subject
├── toArray.ts         - AsyncIterator → Array
└── toCallbacks.ts     - AsyncIterator → callbacks
```

### everything/assertions/ (7 files)
```
assertions/
├── Assertion.ts       - Types (Assertion, Otherwise, Within)
├── assertThat.ts      - Main assertion function
├── both.ts            - Combine assertions
├── collectWhileMatches.ts - Collect until fail
├── is.ts              - Equality assertion
├── not.ts             - Negate assertion
└── willStream.ts      - Async stream assertions
```

### everything/validator/ (6 files)
```
validator/
├── scenario.ts        - Scenario type definition
├── runScenarios.ts    - Execute scenarios
├── watchScenario.ts   - Watch mode
├── dev.ts             - Development entry point
└── spec/
    ├── index.ts       - Test index
    ├── focused_scenarios.ts
    └── watch_mode.ts
```

---

## Next Steps

1. **Immediate:** Complete HTTP imports in funee (current task)
2. **This Week:** Start Phase 1 - AST types and builders in `funee-lib`
3. **Week 2:** Complete AST utilities (`getOutOfScopeReferences`, etc.)
4. **Week 3:** Integration testing with simple macro
5. **Week 4:** Port all macros from `everything/macros/`

---

## Appendix: Key Code Patterns

### Macro Definition Pattern (everything)
```typescript
import { createMacro, Closure, CanonicalName } from "@opah/core";
import { Map } from "@opah/immutable";

export const myMacro = createMacro(<T>(input: Closure<T>) => {
  return Closure<Result>({
    expression: transformedAST,
    references: Map([
      ["Dep", CanonicalName({ uri: "module", name: "Dep" })]
    ])
  });
});
```

### Macro Definition Pattern (funee - target)
```typescript
import { createMacro, Closure, CanonicalName } from "funee";

export const myMacro = createMacro(<T>(input: Closure<T>) => {
  return Closure<Result>({
    expression: transformedAST,
    references: new Map([
      ["Dep", { uri: "module", name: "Dep" }]
    ])
  });
});
```

**Key Differences:**
- Import from `"funee"` instead of `"@opah/core"`
- Use native `Map` instead of Immutable.js `Map`
- `CanonicalName` is a plain object, not a Record factory
