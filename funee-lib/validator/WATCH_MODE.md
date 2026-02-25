# Watch Mode Design

## Overview

Watch mode enables continuous test execution during development. It runs all scenarios initially, then watches source files for changes and re-runs affected scenarios.

## File Dependency Tracking

### Simple Approach (Implemented)
Since funee scenarios are self-contained closures, we use a **path-based** approach:
- User provides explicit `watchPaths` - directories/files to watch
- Any change triggers re-run of all scenarios

This is simpler and works well because:
1. Scenarios are typically fast
2. Avoids complex dependency graph analysis
3. No false negatives (missing dependencies)

### Future Enhancement: Per-Scenario Tracking
Could track which files each scenario touches via:
- Instrumenting `import` calls during scenario execution
- Explicit `dependsOn` field in scenario definition
- File access hooks at the funee runtime level

## Re-run Strategy

### Current: Re-run All
When a file changes:
1. Clear terminal output
2. Log which file changed
3. Re-run all scenarios
4. Show updated results

**Rationale:** Scenarios should be fast. Running all ensures no cross-scenario dependencies are missed.

### Future: Affected Only
Could optimize by:
- Tracking file → scenario mapping
- Only re-running scenarios that depend on changed files
- Showing cached results for unchanged scenarios

## Output Format

### Initial Run
```
🔍 Watch mode started
   Watching: src/, tests/
   Press Ctrl+C to stop

🏃 Running all scenarios...

🏃 addition works
✅  addition works
🏃 strings concatenate  
✅  strings concatenate

📊 Results: 2 passed, 0 failed, 2 total

👀 Watching for changes...
```

### On Change
```
📝 File changed: src/math.ts

🏃 Running all scenarios...

🏃 addition works
❌  addition works

AssertionError: Expected 5 but got 4

📊 Results: 1 passed, 1 failed, 2 total

👀 Watching for changes...
```

## API

```typescript
export type WatchOptions = {
  /** Logger function for output */
  logger: ScenarioLogger;
  /** Paths to watch (files or directories) */
  watchPaths: Array<string>;
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
  /** Clear console on re-run (default: true) */
  clearOnRerun?: boolean;
};

/**
 * Run scenarios in watch mode.
 * 
 * Executes all scenarios initially, then watches for file changes
 * and re-runs on each change. Returns a cleanup function to stop watching.
 * 
 * @param scenarios - Array of scenarios to run
 * @param options - Watch configuration
 * @returns Promise that never resolves (runs indefinitely) with stop function
 */
export const runScenariosWatch = async (
  scenarios: Array<Scenario>,
  options: WatchOptions
): Promise<void> => {
  // Implementation uses watcher module's async iterables
};
```

## Usage Example

```typescript
import { scenario, runScenariosWatch, closure, assertThat, is, log } from "funee";

const scenarios = [
  scenario({
    description: "math works",
    verify: closure(() => async () => {
      await assertThat(1 + 1, is(2));
    }),
  }),
];

await runScenariosWatch(scenarios, {
  logger: log,
  watchPaths: ["src/", "tests/"],
  debounceMs: 100,
});
```

## Implementation Notes

### Watcher Integration
Uses the watcher module's async iterables:
```typescript
import { watchDirectory, type Watcher, type WatchEvent } from "../watcher/index.ts";

const watcher = watchDirectory(path, { recursive: true });

for await (const event of watcher) {
  // Debounce and re-run
}
```

### Debouncing
Multiple rapid file changes (e.g., save + format) should be batched:
- Collect changes for `debounceMs`
- Run once with all accumulated changes
- Show which files changed

### Error Handling
- Watcher errors → log and continue (don't crash)
- Scenario errors → show in output (don't stop watching)
- Graceful shutdown on SIGINT
