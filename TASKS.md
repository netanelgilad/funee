# Funee Tasks

## In Progress
- [ ] Non-exported declarations (private helper functions)

## Queued
- [ ] Multiple host functions (`import { log, fetch } from "funee"`)
- [ ] Class declarations support  
- [ ] Async function support verification
- [ ] Improve error messages (file/line/column instead of panics)
- [ ] Namespace imports (`import * as utils from "./utils.ts"`)

## Done
- [x] Default export expressions (`export default () => {}`)
- [x] Error handling tests (missing imports, parse errors)
- [x] Aliased re-exports (`export { foo as bar }`)
- [x] Variable declarations / arrow functions (`export const add = () => ...`)
- [x] Re-exports through barrel files
- [x] Deep import chains (A → B → C → D)
- [x] Tree-shaking verification
- [x] `--emit` flag for debugging
- [x] Fix source_graph resolved URI bug

## Notes
- Declaration-level bundling is the core differentiator
- Focus on spec'ing out the system through tests first
- Push after each completed task
- 11 E2E tests passing
