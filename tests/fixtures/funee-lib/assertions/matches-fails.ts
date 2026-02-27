import { log, assertThat, matches } from "funee";

export default async () => {
  // This should fail - "hello" has no digits
  await assertThat("hello", matches(/\d+/));
  log("should not reach here");
};
