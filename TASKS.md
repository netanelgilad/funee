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
- [x] Resolve absolute paths (/) from HTTP base URLs (esm.sh pattern)
- [x] Follow HTTP redirects (302, chains)
- [x] Prevent infinite redirect loops
- [x] Tree-shake HTTP modules (unused exports removed)
- [x] CLI flag: `--reload` to bypass cache
- [ ] Import maps support (future)

## Phase 4: Port `everything` Macros ✅ COMPLETE
- [x] closure - captures expression as Closure<Closure<T>>
- [x] canonicalName - gets CanonicalName for a reference
- [x] definition - captures as Definition (declaration + refs)
- [x] tuple - combines multiple closures
- [x] unsafeCast - type assertion (pass-through)
- [x] unsafeDefined - assert defined (pass-through)
- [x] toAST / toCode - helpers for macro authors

## Phase 5: Port Utility Libraries ✅ COMPLETE
- [x] functions/ - curry, not
- [x] collections/ - without
- [x] axax/ - 16 async iterator utilities (with factory functions instead of classes)
- [x] refine/ - type refinement (Refine, KeySet, ensure, encode)
- [x] assertions/ - testing library (assertThat, is, not, both, otherwise)
- [x] random/ - cryptoRandomString (with randomBytes host function)
- [x] git/ - ref parsing (isGitRef, getNameOfRef)

## Phase 6: I/O Libraries (Next)
- [ ] filesystem/ - readFile, writeFile, etc.
- [ ] streams/ - readStreamToString, etc.
- [ ] http/ - httpRequest, httpGetJSON, etc.
- [ ] validator/ - scenario, runScenarios (depends on assertions)

## Design Documents
- `DESIGN-MACROS.md` - Full macro implementation plan
- `HTTP_IMPORTS_DESIGN.md` - HTTP imports strategy
- `PORTING_PLAN.md` - Porting everything repo strategy

## Current Stats (2026-02-25)
- **82 E2E tests passing** ✅
- **22 Rust unit tests passing** ✅
- Functional-only architecture (no classes - use factory functions)
- Macro system fully operational
- HTTP imports fully operational
- All core macros and utility libraries ported

## Bundler Limitations Discovered
1. **Arrow functions only**: Use `export const fn = () => {}` not `export function fn() {}`
2. **No classes**: Use factory functions (`createDeferred()` not `class Deferred`)
3. **No Node.js APIs**: Use web-standard APIs or add host functions
