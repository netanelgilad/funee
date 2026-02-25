/**
 * Test: Assertions work with async values
 */
import { log, assertThat, is, assertion, AssertionError } from "funee";

// Async assertion
const asyncIsPositive = assertion(async (x: number) => {
  // Simulate async operation
  await Promise.resolve();
  if (x <= 0) {
    throw new AssertionError({
      message: `Expected positive number, got ${x}`,
      actual: x,
      expected: "> 0"
    });
  }
});

export default async function() {
  // Async assertion should work
  await assertThat(5, asyncIsPositive);
  log("async assertion passed for 5");
  
  // Regular is() with async assertThat
  await assertThat(42, is(42));
  log("sync assertion in async context passed");
  
  log("async-assertion test complete");
}
