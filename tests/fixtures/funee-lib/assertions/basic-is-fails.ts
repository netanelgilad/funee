/**
 * Test: is() assertion fails on mismatch
 */
import { log, assertThat, is } from "funee";

export default async function() {
  // This should throw an AssertionError
  await assertThat(5, is(10));
  log("should not reach here");
}
