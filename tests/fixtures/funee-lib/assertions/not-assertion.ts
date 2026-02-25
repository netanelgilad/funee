/**
 * Test: notAssertion() wraps and negates assertions
 */
import { log, assertThat, is, notAssertion } from "funee";

export default async function() {
  // notAssertion(is(10)) should pass when value is NOT 10
  await assertThat(5, notAssertion(is(10)));
  log("notAssertion(is(10)) passed for 5");
  
  await assertThat("foo", notAssertion(is("bar")));
  log("notAssertion(is(bar)) passed for foo");
  
  log("not-assertion test complete");
}
