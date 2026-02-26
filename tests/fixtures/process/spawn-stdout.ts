/**
 * Test: Capture stdout from subprocess
 * 
 * Verifies that:
 * 1. stdout is captured as Uint8Array
 * 2. stdoutText() returns decoded string
 * 3. Output matches expected command output
 */
import { spawn, log } from "funee";

export default async function main() {
  // Command that writes to stdout
  const result = await spawn("echo", ["hello world"]);
  
  // Check stdout bytes
  log(`stdout length: ${result.stdout.length}`);
  
  // Check stdout as text
  const text = result.stdoutText();
  log(`stdout text: "${text.trim()}"`);
  
  // Verify output
  if (text.trim() === "hello world") {
    log("spawn-stdout: pass");
  } else {
    log("spawn-stdout: FAIL");
  }
}
