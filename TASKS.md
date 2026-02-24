# Funee Tasks

## In Progress
(none)

## Queued
- [ ] Timer globals (setTimeout, setInterval) - requires deno timer ops
- [ ] Class declarations support  
- [ ] Improve error messages (file/line/column)
- [ ] Namespace imports (`import * as utils from "./utils.ts"`)
- [ ] Import aliasing (`import { foo as bar }`)

## Done
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
- Declaration-level bundling is the core differentiator
- **17 E2E tests passing**
- Timer globals (setTimeout/setInterval) need deno timer ops - separate task
- Push after each completed task
