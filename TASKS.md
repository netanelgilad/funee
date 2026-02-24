# Funee Tasks

## 🎯 Ultimate Goal
**Port the `everything` repo to funee** - same concepts as Opah but funee's implementation.

## Phase 1: Core Macro System (CURRENT)
- [ ] **Macro detection** - recognize `createMacro()` marked functions
- [ ] **Closure capture** - when macro called, capture arg's AST + references
- [ ] **Bundle-time execution** - run macro function during bundling
- [ ] **Emit results** - output the transformed Closure's expression

## Phase 2: HTTP Imports
- [ ] `import { x } from "https://..."` support
- [ ] Caching of remote modules
- [ ] Integrity checking (optional)

## Phase 3: Port `everything` Modules
From ~/clawd/agents/riff/repos/everything/:
- [ ] macros/ - Closure, createMacro, toAST, definition, canonicalName
- [ ] functions/ - functional utilities
- [ ] assertions/ - runtime assertions
- [ ] collections/ - data structures
- [ ] streams/ - async iterators (axax)
- [ ] validator/ - validation utilities
- [ ] filesystem/ - file operations
- [ ] http/ - HTTP client
- [ ] memoize/ - caching
- [ ] refine/ - refinement types

## Done
- [x] Declaration-level bundling
- [x] Tree-shaking
- [x] Import chains & re-exports
- [x] Arrow functions / VarInit
- [x] Async functions
- [x] Global support (Promise, Object, etc.)
- [x] Multiple host functions
- [x] --emit flag

## Current Stats
- **18 E2E tests passing** (+ 1 failing macro spec)
- Functional-only architecture (no classes)

## Subagent Tasks (overnight)
Spawn subagents to parallelize work on:
1. Macro system implementation
2. HTTP imports
3. Porting specific everything modules
