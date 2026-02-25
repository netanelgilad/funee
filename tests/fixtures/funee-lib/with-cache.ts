import { log, withCache } from "funee";

// Test withCache utility
export default () => {
  let callCount = 0;
  
  const expensiveFunc = withCache((x: number) => {
    callCount++;
    return x * 2;
  });
  
  // First call - should compute
  const result1 = expensiveFunc(5);
  log(`result1: ${result1}`);
  log(`calls after first: ${callCount}`);
  
  // Second call with same arg - should use cache
  const result2 = expensiveFunc(5);
  log(`result2: ${result2}`);
  log(`calls after second: ${callCount}`);
  
  // Third call with different arg - should compute
  const result3 = expensiveFunc(10);
  log(`result3: ${result3}`);
  log(`calls after third: ${callCount}`);
  
  log("withCache test complete");
};
