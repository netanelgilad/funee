/**
 * Test: both() combines two assertions
 */
import { log, assertThat, both, assertion, AssertionError } from "funee";

// Custom assertion helpers using funee's AssertionError
const isNumber = assertion((x: number) => {
  if (typeof x !== "number") {
    throw new AssertionError({
      message: `Expected a number, got ${typeof x}`,
      actual: typeof x,
      expected: "number"
    });
  }
});

const isPositive = assertion((x: number) => {
  if (x <= 0) {
    throw new AssertionError({
      message: `Expected positive number, got ${x}`,
      actual: x,
      expected: "> 0"
    });
  }
});

export default async function() {
  // both(isNumber, isPositive) should pass for positive numbers
  await assertThat(5, both(isNumber, isPositive));
  log("both(isNumber, isPositive) passed for 5");
  
  await assertThat(100, both(isNumber, isPositive));
  log("both(isNumber, isPositive) passed for 100");
  
  log("both-assertion test complete");
}
