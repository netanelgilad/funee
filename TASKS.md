# Funee Tasks

## 🎯 Ultimate Goal
**Port the `everything` repo to funee** - same concepts as Opah but funee's implementation.

## Phase 1: Core Macro System (IN PROGRESS)

### Step 1: Macro Detection ✅ DONE
- [x] Detect `createMacro()` pattern in variable declarations
- [x] Add `Declaration::Macro` variant
- [x] Tests passing

### Step 2: Closure Capture (ACTIVE - subagent working)
- [ ] Detect macro calls (e.g., `closure(add)`)
- [ ] Capture argument AST instead of bundling normally
- [ ] Build Closure struct with expression + references

### Step 3: Macro Execution (ACTIVE - subagent designing)
- [ ] Use deno_core to execute macros during bundling
- [ ] Serialize Closure to JS, call macro, deserialize result
- [ ] Handle recursive macro calls

### Step 4: AST Replacement
- [ ] Replace macro call site with result expression
- [ ] Merge result references into definition
- [ ] Handle reference conflicts (IIFE wrapping)

## Phase 2: Funee Standard Library (ACTIVE - subagent working)
- [ ] `Closure<T>` type
- [ ] `CanonicalName` type  
- [ ] `createMacro()` marker function
- [ ] Host functions (log, debug, etc.)

## Phase 3: HTTP Imports (DESIGNED)
- [ ] Implement reqwest-based HTTP fetching
- [ ] Cache at ~/.funee/cache/
- [ ] Handle network failures gracefully
- See: HTTP_IMPORTS_DESIGN.md

## Phase 4: Port `everything` Modules
- [ ] macros/ - closure, definition, toAST, etc.
- [ ] functions/ - curry, not, etc.
- [ ] collections/
- [ ] streams/ (axax)
- [ ] validator/
- [ ] And more...

## Active Subagents
- `macro-step2-closure-capture` - implementing argument capture
- `macro-step3-execution` - designing deno_core macro execution
- `funee-runtime-lib` - creating TypeScript standard library

## Design Documents
- `DESIGN-MACROS.md` - Full macro implementation plan
- `HTTP_IMPORTS_DESIGN.md` - HTTP imports strategy
- `MACRO_IMPLEMENTATION_PROGRESS.md` - Step-by-step progress
- `docs/OPAH-ANALYSIS.md` - Opah system analysis

## Current Stats
- **18 E2E tests passing** + 1 macro spec (intentionally failing)
- Functional-only architecture (no classes)
