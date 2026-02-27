import { log, assertThat, lessThan } from "funee";

export default async () => {
  // This should fail - 10 is not less than 5
  await assertThat(10, lessThan(5));
  log("should not reach here");
};
