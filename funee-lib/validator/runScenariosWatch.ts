/**
 * runScenariosWatch - Watch mode for scenario execution.
 * 
 * Runs scenarios initially, then watches for file changes and re-runs
 * affected scenarios automatically.
 * 
 * @example
 * import { scenario, runScenariosWatch, closure, assertThat, is, log } from "funee";
 * 
 * const scenarios = [
 *   scenario({
 *     description: "math works",
 *     verify: closure(() => async () => { await assertThat(1 + 1, is(2)); }),
 *   }),
 * ];
 * 
 * await runScenariosWatch(scenarios, {
 *   logger: log,
 *   watchPaths: ["src/", "tests/"],
 * });
 */

import type { Scenario } from "./scenario.ts";
import type { ScenarioLogger, ScenarioResult } from "./runScenarios.ts";
import { runScenarios } from "./runScenarios.ts";
import { watchDirectory, type Watcher, type WatchEvent } from "../watcher/index.ts";

/**
 * Options for watch mode execution.
 */
export type WatchOptions = {
  /** Logger function for output */
  logger: ScenarioLogger;
  /** Paths to watch (directories only - uses recursive watching) */
  watchPaths: Array<string>;
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number;
  /** Clear console on re-run (default: true) */
  clearOnRerun?: boolean;
  /** Maximum concurrent scenarios (default: 10) */
  concurrency?: number;
};

/**
 * Sleep for a specified duration.
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Create a debounced event collector.
 * Collects events over a time window and returns them as a batch.
 */
const createDebouncer = (debounceMs: number) => {
  let pendingEvents: Array<WatchEvent> = [];
  let timeoutResolve: (() => void) | null = null;

  return {
    add: (event: WatchEvent) => {
      pendingEvents.push(event);
      if (timeoutResolve) {
        // Already waiting, event will be included in current batch
      }
    },
    waitForBatch: async (): Promise<Array<WatchEvent>> => {
      if (pendingEvents.length === 0) {
        // Wait indefinitely until an event arrives
        return [];
      }
      // Wait for debounce period
      await sleep(debounceMs);
      const batch = pendingEvents;
      pendingEvents = [];
      return batch;
    },
    hasPending: () => pendingEvents.length > 0,
  };
};

/**
 * Log the header for watch mode.
 */
const logWatchHeader = (
  logger: ScenarioLogger,
  watchPaths: Array<string>
): void => {
  logger("🔍 Watch mode started");
  logger(`   Watching: ${watchPaths.join(", ")}`);
  logger("   Press Ctrl+C to stop");
  logger("");
};

/**
 * Log changed files before re-run.
 */
const logChangedFiles = (
  logger: ScenarioLogger,
  events: Array<WatchEvent>
): void => {
  // Deduplicate paths
  const uniquePaths = [...new Set(events.map((e) => e.path))];
  logger("");
  logger("─".repeat(50));
  logger(`📝 ${uniquePaths.length} file(s) changed:`);
  for (const path of uniquePaths.slice(0, 5)) {
    logger(`   ${path}`);
  }
  if (uniquePaths.length > 5) {
    logger(`   ... and ${uniquePaths.length - 5} more`);
  }
  logger("");
};

/**
 * Run scenarios in watch mode.
 * 
 * Executes all scenarios initially, then watches for file changes
 * and re-runs on each change. This function runs indefinitely until
 * stopped externally (e.g., Ctrl+C).
 * 
 * @param scenarios - Array of scenarios to run
 * @param options - Watch configuration
 * @returns Promise that never resolves (runs indefinitely)
 */
export const runScenariosWatch = async (
  scenarios: Array<Scenario>,
  options: WatchOptions
): Promise<void> => {
  const {
    logger,
    watchPaths,
    debounceMs = 100,
    clearOnRerun = true,
    concurrency = 10,
  } = options;

  if (watchPaths.length === 0) {
    throw new Error("watchPaths must contain at least one path");
  }

  // Log header
  logWatchHeader(logger, watchPaths);

  // Run initial pass
  logger("🏃 Running all scenarios...");
  logger("");
  await runScenarios(scenarios, { logger, concurrency });

  logger("");
  logger("👀 Watching for changes...");

  // Start watchers for all paths
  const watchers: Array<Watcher> = watchPaths.map((path) =>
    watchDirectory(path, { recursive: true })
  );

  // Create debouncer
  const debouncer = createDebouncer(debounceMs);

  // Merge all watcher streams
  const runWatchLoop = async (): Promise<void> => {
    // Start polling all watchers concurrently
    const watcherPromises = watchers.map(async (watcher, index) => {
      for await (const event of watcher) {
        debouncer.add(event);
      }
    });

    // Main loop: wait for debounced batches and re-run
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      // Poll debouncer
      await sleep(50); // Check every 50ms
      
      if (debouncer.hasPending()) {
        // Wait for debounce window
        await sleep(debounceMs);
        
        // Collect all events accumulated during debounce
        const events: Array<WatchEvent> = [];
        while (debouncer.hasPending()) {
          const batch = await debouncer.waitForBatch();
          events.push(...batch);
        }

        if (events.length > 0) {
          // Log what changed
          logChangedFiles(logger, events);

          // Re-run all scenarios
          logger("🏃 Running all scenarios...");
          logger("");
          await runScenarios(scenarios, { logger, concurrency });

          logger("");
          logger("👀 Watching for changes...");
        }
      }
    }
  };

  await runWatchLoop();
};
