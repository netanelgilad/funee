/**
 * Test: otherwise() provides additional error context
 */
import { log, assertThat, is, otherwise } from "funee";

export default async function() {
  const expected = 42;
  const actual = 99;
  
  try {
    await assertThat(
      actual,
      is(expected),
      otherwise((err) => `Extra context: expected ${expected}, got ${actual}`)
    );
    log("should not reach here");
  } catch (err) {
    // Verify the error message contains the additional context
    const message = (err as Error).message;
    if (message.includes("More Information provided:") && 
        message.includes("Extra context:")) {
      log("otherwise context was added to error message");
    } else {
      log("ERROR: otherwise context was NOT added");
      throw err;
    }
  }
  
  log("otherwise-context test complete");
}
