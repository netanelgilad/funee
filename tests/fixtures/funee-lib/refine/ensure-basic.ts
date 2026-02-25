import { log, ensure } from "funee";
import type { Refine, KeySet } from "funee";

// Define a refined type
type ValidatedString = Refine<string, KeySet<"Validated">>;

// Create a validator function
function createValidator() {
  return (s: string): s is ValidatedString => s.length >= 3;
}

export default function() {
  const input = "hello";
  const validator = createValidator();
  
  // Use ensure to assert the value matches the refinement
  ensure(validator, input);
  
  // If we get here, the assertion passed
  log("ensure works");
  log(`validated: ${input}`);
}
