import { log, memoizeInFS, fsExists } from "funee";

// Test memoizeInFS utility
export default async () => {
  let callCount = 0;
  
  const expensiveFunc = memoizeInFS("test_memoize", (x: number) => {
    callCount++;
    return x * 2;
  });
  
  // First call - should compute and cache
  const result1 = await expensiveFunc(5);
  log(`result1: ${result1}`);
  log(`calls after first: ${callCount}`);
  
  // Second call with same arg - should use in-memory cache
  const result2 = await expensiveFunc(5);
  log(`result2: ${result2}`);
  log(`calls after second: ${callCount}`);
  
  // Third call with different arg - should compute
  const result3 = await expensiveFunc(10);
  log(`result3: ${result3}`);
  log(`calls after third: ${callCount}`);
  
  // Cache directory should exist
  log(`cache dir exists: ${fsExists("./cache") ? "pass" : "fail"}`);
  
  // Cache file should exist
  log(`cache file exists: ${fsExists("./cache/test_memoize_5") ? "pass" : "fail"}`);
  
  log("memoizeInFS test complete");
};
