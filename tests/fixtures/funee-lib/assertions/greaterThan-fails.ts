import { log, assertThat, greaterThan } from "funee";

export default async () => {
  // This should fail - 3 is not greater than 5
  await assertThat(3, greaterThan(5));
  log("should not reach here");
};
