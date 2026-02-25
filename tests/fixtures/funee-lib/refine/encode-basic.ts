import { log, encode } from "funee";
import type { Refine, KeySet } from "funee";

// Define a refined type
type Trimmed = Refine<string, KeySet<"Trimmed">>;

// Create a validator function
function createValidator() {
  return (s: string): s is Trimmed => s === s.trim();
}

export default function() {
  const input = "hello";
  const validator = createValidator();
  
  // Use encode to get the refined value
  const trimmed = encode(validator, input);
  
  log("encode works");
  log(`encoded: ${trimmed}`);
}
