/**
 * Test: notAssertion() fails when inner assertion passes
 */
import { log, assertThat, is, notAssertion } from "funee";

export default async function() {
  // notAssertion(is(5)) should fail when value IS 5
  await assertThat(5, notAssertion(is(5)));
  log("should not reach here");
}
