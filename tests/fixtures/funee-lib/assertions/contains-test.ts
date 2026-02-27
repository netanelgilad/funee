import { log, assertThat, contains } from "funee";

export default async () => {
  // String containment
  await assertThat("hello world", contains("world"));
  log("contains(world) passed for 'hello world'");
  
  await assertThat("hello world", contains("hello"));
  log("contains(hello) passed for 'hello world'");
  
  // Array containment with primitives
  await assertThat([1, 2, 3], contains(2));
  log("contains(2) passed for [1, 2, 3]");
  
  await assertThat(["a", "b", "c"], contains("b"));
  log("contains(b) passed for ['a', 'b', 'c']");
  
  // Array containment with deep equality
  await assertThat([{a: 1}, {b: 2}], contains({a: 1}));
  log("contains({a: 1}) passed for [{a: 1}, {b: 2}]");
  
  await assertThat([{x: {y: 1}}], contains({x: {y: 1}}));
  log("contains({x: {y: 1}}) passed for nested objects");
  
  log("contains-test complete");
};
