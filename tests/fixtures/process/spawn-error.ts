/**
 * Test: Handle subprocess errors gracefully
 * 
 * Verifies that:
 * 1. Command not found throws an error
 * 2. Error message is descriptive
 * 3. Does not crash the runtime
 */
import { spawn, log } from "funee";

export default async () => {
  // Test 1: Non-existent command
  let errorCaught = false;
  let errorMessage = "";
  
  try {
    await spawn("nonexistent_command_xyz123", ["arg"]);
  } catch (e: unknown) {
    errorCaught = true;
    errorMessage = e instanceof Error ? e.message : String(e);
  }
  
  log(`command not found error caught: ${errorCaught}`);
  log(`error message contains useful info: ${errorMessage.includes("not found") || errorMessage.includes("No such file") || errorMessage.includes("ENOENT")}`);
  
  // Test 2: Invalid cwd
  let cwdErrorCaught = false;
  
  try {
    const proc = spawn({
      cmd: ["echo", "hello"],
      cwd: "/nonexistent/directory/xyz123",
    });
    await proc.status;
  } catch (e: unknown) {
    cwdErrorCaught = true;
  }
  
  log(`invalid cwd error caught: ${cwdErrorCaught}`);
  
  if (errorCaught) {
    log("spawn-error: pass");
  } else {
    log("spawn-error: FAIL");
  }
}
