# Funee Tasks

## 🎯 Ultimate Goal
**Port the `everything` repo to funee** - same concepts as Opah but funee's implementation.

## Phase 1: Core Macro System ✅ COMPLETE
- [x] Macro detection (`createMacro()` pattern)
- [x] Closure capture (expression + references)
- [x] Macro execution via deno_core
- [x] AST replacement with reference merging
- [x] Recursive macro support
- [x] Infinite recursion prevention
- [x] funee-lib integration (Closure, CanonicalName, createMacro, log)

## Phase 2: Funee Standard Library ✅ COMPLETE
- [x] `Closure<T>` type and constructor
- [x] `CanonicalName` type  
- [x] `createMacro()` marker function
- [x] Host functions (log via Deno.core.ops)
- [x] All imports from "funee" working
- [x] AST types, predicates, and builders
- [x] AST utilities (walkAST, cloneAST, replaceNodesByType, getOutOfScopeReferences)

## Phase 3: HTTP Imports ✅ COMPLETE
- [x] Implement reqwest-based HTTP fetching
- [x] Cache at ~/.funee/cache/
- [x] Handle network failures with stale cache fallback
- [x] Support https:// and http:// URLs
- [x] Resolve relative imports from HTTP base URLs
- [x] Follow HTTP redirects (302, chains)
- [x] Tree-shake HTTP modules
- [x] CLI flag: `--reload` to bypass cache

## Phase 4: Port `everything` Macros ✅ COMPLETE
- [x] closure - captures expression as Closure<Closure<T>>
- [x] canonicalName - gets CanonicalName for a reference
- [x] definition - captures as Definition
- [x] tuple - combines multiple closures
- [x] unsafeCast, unsafeDefined - type assertions

## Phase 5: Port Utility Libraries ✅ COMPLETE
- [x] functions/ - curry, not
- [x] collections/ - without
- [x] axax/ - 16 async iterator utilities
- [x] refine/ - type refinement (Refine, KeySet, ensure, encode)
- [x] assertions/ - testing library (assertThat, is, not, both, otherwise)
- [x] random/ - cryptoRandomString
- [x] git/ - ref parsing

## Phase 6: I/O Libraries ✅ COMPLETE
- [x] filesystem/ - readFile, writeFile, isFile, lstat, readdir
- [x] http/ - httpRequest, httpGetJSON, httpPostJSON
- [x] streams/ - toString, toBuffer, fromString, fromBuffer, empty
- [x] validator/ - scenario, runScenarios

## What's Left (Lower Priority)
- [ ] tar/ - archive handling
- [ ] github/ - GitHub API
- [ ] npm/ - NPM publishing
- [ ] memoize/ - FS-based memoization
- [ ] watcher/ - file watching
- [ ] Import maps support

## Current Stats (2026-02-25)
- **96 E2E tests passing** ✅
- **22 Rust unit tests passing** ✅
- Functional-only architecture (no classes)
- Complete macro system
- Full I/O capabilities

## Bundler Limitations Documented
1. **Arrow functions only**: Use `const fn = () => {}` not `function fn() {}`
2. **No classes**: Use factory functions
3. **No Node.js APIs**: Use web-standard APIs or add host functions
4. **Op naming**: Host function names become `op_<name>` in Deno.core.ops
