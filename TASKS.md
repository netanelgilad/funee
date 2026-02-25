# Funee Tasks

## 🎯 Ultimate Goal
**Port the `everything` repo to funee** - same concepts as Opah but funee's implementation.

## Phase 1: Core Macro System ✅ COMPLETE
All 35 E2E tests + 11 Rust unit tests passing!

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

## Phase 3: HTTP Imports (NEXT)
- [ ] Implement reqwest-based HTTP fetching
- [ ] Cache at ~/.funee/cache/
- [ ] Handle network failures gracefully
- [ ] Support https:// and http:// URLs
- See: HTTP_IMPORTS_DESIGN.md

## Phase 4: Port `everything` Modules
Once HTTP imports work, start porting:
- [ ] macros/ - closure, definition, toAST, etc.
- [ ] functions/ - curry, not, etc.
- [ ] collections/
- [ ] streams/ (axax)
- [ ] validator/
- [ ] And more...

## Design Documents
- `DESIGN-MACROS.md` - Full macro implementation plan
- `HTTP_IMPORTS_DESIGN.md` - HTTP imports strategy
- `MACRO_IMPLEMENTATION_PROGRESS.md` - Step-by-step progress

## Current Stats (2026-02-25)
- **35 E2E tests passing** ✅
- **11 Rust unit tests passing** ✅
- Functional-only architecture (no classes)
- Macro system fully operational
