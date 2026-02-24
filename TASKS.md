# Funee Tasks

## In Progress
- [ ] Variable declarations / arrow functions (`export const add = () => ...`)

## Queued
- [ ] Aliased re-export test (use `{ helper as aliased }`)
- [ ] Error handling: missing import errors with clear messages
- [ ] Error handling: parse errors with file/line/column
- [ ] Multiple host functions test (`import { log, fetch, readFile } from "funee"`)
- [ ] Class declarations support
- [ ] Async function support verification
- [ ] Default export expressions (`export default () => {}`)

## Done
- [x] Re-exports through barrel files
- [x] Deep import chains (A → B → C → D)
- [x] Tree-shaking verification
- [x] `--emit` flag for debugging
- [x] Fix source_graph resolved URI bug

## Notes
- Declaration-level bundling is the core differentiator
- Focus on spec'ing out the system through tests first
- Push after each completed task
