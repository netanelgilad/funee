/**
 * Test: Capture stderr from subprocess
 * 
 * Verifies that:
 * 1. stderr is captured separately from stdout
 * 2. stderrText() returns decoded string
 * 3. Error output appears in stderr, not stdout
 */
import { spawn, log } from "funee";

export default async () => {
  // Command that writes to stderr: ls nonexistent file
  const result = await spawn("ls", ["nonexistent_file_12345"]);
  
  // Check stderr
  const stderrText = result.stderrText();
  log(`stderr length: ${result.stderr.length}`);
  log(`stderr contains error: ${stderrText.includes("No such file") || stderrText.includes("cannot access") || stderrText.includes("nonexistent")}`);
  
  // stdout should be empty for this command
  const stdoutText = result.stdoutText();
  log(`stdout is empty: ${stdoutText.length === 0}`);
  
  // Should have failed
  log(`success: ${result.status.success}`);
  
  if (!result.status.success && result.stderr.length > 0) {
    log("spawn-stderr: pass");
  } else {
    log("spawn-stderr: FAIL");
  }
}
