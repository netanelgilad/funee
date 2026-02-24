# Funee Tasks

## Architecture Decision
**Functional-only ecosystem** - No class support. Functions + closures cover all use cases for the macro system.

## In Progress
(none)

## Queued
- [ ] Timer globals (setTimeout, setInterval) - requires deno timer ops
- [ ] Improve error messages (file/line/column)
- [ ] Namespace imports (`import * as utils from "./utils.ts"`)

## Done
- [x] Import aliasing (`import { foo as bar }`)
- [x] Global support (Promise, Object, Array, JSON, Math, etc.)
- [x] Async function support
- [x] Multiple host functions (`import { log, debug } from "funee"`)
- [x] Non-exported declarations (private helper functions)
- [x] Default export expressions (`export default () => {}`)
- [x] Error handling tests (missing imports, parse errors)
- [x] Aliased re-exports (`export { foo as bar }`)
- [x] Variable declarations / arrow functions
- [x] Re-exports through barrel files
- [x] Deep import chains (A → B → C → D)
- [x] Tree-shaking verification
- [x] `--emit` flag for debugging
- [x] Fix source_graph resolved URI bug

## Notes
- **18 E2E tests passing**
- Timer globals need deno timer ops
- Functional-only = simpler bundler, cleaner macro transforms
