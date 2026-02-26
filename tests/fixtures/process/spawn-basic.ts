/**
 * Test: Basic subprocess spawn and exit code
 * 
 * Verifies that:
 * 1. spawn() can run a simple command
 * 2. The process exits with code 0 for successful commands
 * 3. status.success is true for exit code 0
 */
import { spawn, log } from "funee";

export default async () => {
  // Simple command that exits successfully
  const result = await spawn("echo", ["hello"]);
  
  // Check exit code
  const exitCode = result.status.code;
  log(`exit code: ${exitCode}`);
  log(`success: ${result.status.success}`);
  
  // Verify success
  if (exitCode === 0 && result.status.success) {
    log("spawn-basic: pass");
  } else {
    log("spawn-basic: FAIL");
  }
}
