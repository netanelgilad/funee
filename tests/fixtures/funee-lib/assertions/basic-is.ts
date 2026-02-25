/**
 * Test: Basic is() assertion
 */
import { log, assertThat, is } from "funee";

export default async function() {
  // Test passing assertion
  await assertThat(4, is(4));
  log("is(4) passed for 4");
  
  await assertThat("hello", is("hello"));
  log("is(hello) passed for hello");
  
  log("basic-is test complete");
}
