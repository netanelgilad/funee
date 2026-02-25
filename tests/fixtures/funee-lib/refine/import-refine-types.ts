import { log } from "funee";
import type { Refine, KeySet } from "funee";

// Test that the Refine type can be used to create branded types
type PositiveNumber = Refine<number, { Positive: null }>;
type NonEmptyString = Refine<string, KeySet<"NonEmpty">>;

export default function() {
  log("Refine type imported");
  log("KeySet type imported");
  
  // Test the types work
  const num: PositiveNumber = 42 as PositiveNumber;
  log(`positive: ${num}`);
  
  const str: NonEmptyString = "hello" as NonEmptyString;
  log(`non-empty: ${str}`);
  
  log("type guard works");
  log("KeySet type guard works");
}
