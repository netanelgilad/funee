import { log, ensure, encode } from "funee";
import type { Refine, KeySet } from "funee";

// Define refined types
type Email = Refine<string, KeySet<"ValidEmail">>;
type PositiveNumber = Refine<number, { Positive: null }>;
type SafeString = Refine<string, { Sanitized: null; NonEmpty: null }>;

// Create validator functions
function makeEmailValidator() {
  return (s: string): s is Email => s.includes("@") && s.includes(".");
}

function makePositiveValidator() {
  return (n: number): n is PositiveNumber => n > 0;
}

function makeSafeValidator() {
  return (s: string): s is SafeString => s.length > 0 && !s.includes("<script>");
}

export default function() {
  // Test ensure with email
  const emailInput = "test@example.com";
  const emailValidator = makeEmailValidator();
  ensure(emailValidator, emailInput);
  log(`email validated: ${emailInput}`);
  
  // Test encode with positive number
  const num = 42;
  const positiveValidator = makePositiveValidator();
  const positiveNum = encode(positiveValidator, num);
  log(`positive encoded: ${positiveNum}`);
  
  // Test with multiple knowledge tokens
  const safeInput = "hello world";
  const safeValidator = makeSafeValidator();
  const safe = encode(safeValidator, safeInput);
  log(`safe string: ${safe}`);
  
  log("combined usage works");
}
