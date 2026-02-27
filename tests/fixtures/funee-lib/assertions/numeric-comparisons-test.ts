import { log, assertThat, greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual } from "funee";

export default async () => {
  // greaterThan
  await assertThat(5, greaterThan(3));
  log("greaterThan(3) passed for 5");
  
  await assertThat(100, greaterThan(99));
  log("greaterThan(99) passed for 100");
  
  // lessThan
  await assertThat(2, lessThan(10));
  log("lessThan(10) passed for 2");
  
  await assertThat(-5, lessThan(0));
  log("lessThan(0) passed for -5");
  
  // greaterThanOrEqual
  await assertThat(5, greaterThanOrEqual(5));
  log("greaterThanOrEqual(5) passed for 5");
  
  await assertThat(6, greaterThanOrEqual(5));
  log("greaterThanOrEqual(5) passed for 6");
  
  // lessThanOrEqual
  await assertThat(5, lessThanOrEqual(5));
  log("lessThanOrEqual(5) passed for 5");
  
  await assertThat(4, lessThanOrEqual(5));
  log("lessThanOrEqual(5) passed for 4");
  
  log("numeric-comparisons-test complete");
};
