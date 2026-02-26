/**
 * runScenariosWatch - Watch mode for scenario execution.
 * 
 * Runs scenarios initially, then watches for file changes in the closure's
 * reference graph and re-runs only affected scenarios.
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
 * await runScenariosWatch(scenarios, { logger: log });
 */

import type { Scenario } from "./scenario.ts";
import type { CanonicalName } from "../core.ts";
import type { ScenarioLogger, ScenarioResult } from "./runScenarios.ts";
import { runScenarios } from "./runScenarios.ts";
import { watchFile, type Watcher, type WatchEvent } from "../watcher/index.ts";

/**
 * Options for watch mode execution.
 */
export type ScenarioWatchOptions = {
  /** Logger function for output */
  logger: ScenarioLogger;
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
 * Extract all file URIs from a scenario's closure references.
 * Only includes local file paths (starts with "/"), not package imports.
 */
const getFileUrisFromScenario = (scenario: Scenario): Set<string> => {
  const uris = new Set<string>();
  const references = scenario.verify.references;
  
  if (references instanceof Map) {
    for (const [_, canonicalName] of references) {
      const cn = canonicalName as CanonicalName;
      // Only watch local files, not package imports like "funee"
      if (cn.uri && cn.uri.startsWith("/")) {
        uris.add(cn.uri);
      }
    }
  }
  
  return uris;
};

/**
 * Build a map from file URIs to the scenarios that depend on them.
 */
const buildFileToScenariosMap = (
  scenarios: Array<Scenario>
): Map<string, Set<number>> => {
  const fileToScenarios = new Map<string, Set<number>>();
  
  scenarios.forEach((scenario, index) => {
    const uris = getFileUrisFromScenario(scenario);
    for (const uri of uris) {
      const existing = fileToScenarios.get(uri) ?? new Set<number>();
      existing.add(index);
      fileToScenarios.set(uri, existing);
    }
  });
  
  return fileToScenarios;
};

/**
 * Get all unique file URIs from all scenarios.
 */
const getAllFileUris = (scenarios: Array<Scenario>): Set<string> => {
  const allUris = new Set<string>();
  
  for (const scenario of scenarios) {
    const uris = getFileUrisFromScenario(scenario);
    for (const uri of uris) {
      allUris.add(uri);
    }
  }
  
  return allUris;
};

/**
 * Create a debounced event collector.
 * Collects events over a time window and returns them as a batch.
 */
const createDebouncer = (debounceMs: number) => {
  let pendingEvents: Array<WatchEvent> = [];

  return {
    add: (event: WatchEvent) => {
      pendingEvents.push(event);
    },
    waitForBatch: async (): Promise<Array<WatchEvent>> => {
      if (pendingEvents.length === 0) {
        return [];
      }
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
  fileCount: number
): void => {
  logger("🔍 Watch mode started");
  logger(`   Watching ${fileCount} file(s) from closure references`);
  logger("   Press Ctrl+C to stop");
  logger("");
};

/**
 * Log changed files before re-run.
 */
const logChangedFiles = (
  logger: ScenarioLogger,
  events: Array<WatchEvent>,
  affectedScenarios: Array<Scenario>
): void => {
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
  logger(`🎯 ${affectedScenarios.length} scenario(s) affected`);
  logger("");
};

/**
 * Run scenarios in watch mode.
 * 
 * Executes all scenarios initially, then watches for file changes
 * in the closure reference graph and re-runs only affected scenarios.
 * 
 * @param scenarios - Array of scenarios to run
 * @param options - Watch configuration
 * @returns Promise that never resolves (runs indefinitely)
 */
export const runScenariosWatch = async (
  scenarios: Array<Scenario>,
  options: ScenarioWatchOptions
): Promise<void> => {
  const {
    logger,
    debounceMs = 100,
    concurrency = 10,
  } = options;

  // Build the file-to-scenarios mapping
  const fileToScenarios = buildFileToScenariosMap(scenarios);
  const allFileUris = getAllFileUris(scenarios);

  if (allFileUris.size === 0) {
    logger("⚠️  No local file references found in scenarios");
    logger("   Running scenarios once without watch mode");
    await runScenarios(scenarios, { logger, concurrency });
    return;
  }

  // Log header
  logWatchHeader(logger, allFileUris.size);

  // Run initial pass with all scenarios
  logger("🏃 Running all scenarios...");
  logger("");
  await runScenarios(scenarios, { logger, concurrency });

  logger("");
  logger("👀 Watching for changes...");

  // Start watchers for each file in the closure graph
  const watchers: Array<Watcher> = [];
  for (const uri of allFileUris) {
    watchers.push(watchFile(uri));
  }

  // Create debouncer
  const debouncer = createDebouncer(debounceMs);

  // Start polling all watchers concurrently
  for (const watcher of watchers) {
    (async () => {
      for await (const event of watcher) {
        debouncer.add(event);
      }
    })();
  }

  // Main loop: wait for debounced batches and re-run affected scenarios
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    await sleep(50);
    
    if (debouncer.hasPending()) {
      await sleep(debounceMs);
      
      const events: Array<WatchEvent> = [];
      while (debouncer.hasPending()) {
        const batch = await debouncer.waitForBatch();
        events.push(...batch);
      }

      if (events.length > 0) {
        // Determine which scenarios are affected by the changed files
        const affectedIndices = new Set<number>();
        for (const event of events) {
          const scenarioIndices = fileToScenarios.get(event.path);
          if (scenarioIndices) {
            for (const idx of scenarioIndices) {
              affectedIndices.add(idx);
            }
          }
        }

        // Get the affected scenarios
        const affectedScenarios = [...affectedIndices].map((idx) => scenarios[idx]);

        if (affectedScenarios.length > 0) {
          logChangedFiles(logger, events, affectedScenarios);

          // Re-run only affected scenarios
          logger(`🏃 Running ${affectedScenarios.length} affected scenario(s)...`);
          logger("");
          await runScenarios(affectedScenarios, { logger, concurrency });

          logger("");
          logger("👀 Watching for changes...");
        }
      }
    }
  }
};
