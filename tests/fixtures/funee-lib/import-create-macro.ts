import { createMacro, log } from "funee";

export default function() {
  // Test that createMacro is a function
  log(`createMacro is function: ${typeof createMacro === 'function'}`);
}
