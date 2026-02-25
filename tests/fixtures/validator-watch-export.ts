/**
 * Test that runScenariosWatch is properly exported from funee.
 * 
 * Since watch mode runs indefinitely, we only verify the export exists
 * and has the correct type signature.
 */

import { log, runScenariosWatch, WatchOptions } from "funee";

export default async () => {
  // Test 1: runScenariosWatch is exported
  log(`runScenariosWatch exported: ${runScenariosWatch !== undefined ? 'yes' : 'no'}`);
  
  // Test 2: runScenariosWatch is a function
  log(`runScenariosWatch is function: ${typeof runScenariosWatch === 'function' ? 'yes' : 'no'}`);
  
  // Test 3: WatchOptions type check (compile-time verification)
  // If this compiles, the type is correct
  const _options: WatchOptions = {
    logger: log,
    watchPaths: ["src/"],
    debounceMs: 100,
    clearOnRerun: true,
    concurrency: 5,
  };
  log('WatchOptions type check: pass');
  
  return 'runScenariosWatch export test complete';
};
