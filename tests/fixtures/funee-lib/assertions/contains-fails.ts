import { log, assertThat, contains } from "funee";

export default async () => {
  // This should fail - "world" is not in "hello"
  await assertThat("hello", contains("world"));
  log("should not reach here");
};
