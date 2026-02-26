/**
 * Test: Get non-zero exit codes from subprocess
 * 
 * Verifies that:
 * 1. Non-zero exit codes are captured correctly
 * 2. status.success is false for non-zero codes
 * 3. Different exit codes are distinguishable
 */
import { spawn, log } from "funee";

export default async function main() {
  // Test 1: Exit code 1
  const result1 = await spawn("sh", ["-c", "exit 1"]);
  log(`exit 1 - code: ${result1.status.code}`);
  log(`exit 1 - success: ${result1.status.success}`);
  
  // Test 2: Exit code 42
  const result2 = await spawn("sh", ["-c", "exit 42"]);
  log(`exit 42 - code: ${result2.status.code}`);
  log(`exit 42 - success: ${result2.status.success}`);
  
  // Test 3: Exit code 0 (success)
  const result3 = await spawn("sh", ["-c", "exit 0"]);
  log(`exit 0 - code: ${result3.status.code}`);
  log(`exit 0 - success: ${result3.status.success}`);
  
  // Test 4: Exit code 255 (max)
  const result4 = await spawn("sh", ["-c", "exit 255"]);
  log(`exit 255 - code: ${result4.status.code}`);
  
  // Verify all exit codes
  const allCorrect = 
    result1.status.code === 1 && !result1.status.success &&
    result2.status.code === 42 && !result2.status.success &&
    result3.status.code === 0 && result3.status.success &&
    result4.status.code === 255;
  
  if (allCorrect) {
    log("spawn-exit-code: pass");
  } else {
    log("spawn-exit-code: FAIL");
  }
}
