/**
 * Test: Kill a running subprocess
 * 
 * Verifies that:
 * 1. kill() sends a signal to the process
 * 2. Process terminates when killed
 * 3. status.signal contains the termination signal
 */
import { spawn, log } from "funee";

export default async () => {
  // Start a long-running process
  const proc = spawn({
    cmd: ["sleep", "60"],
  });
  
  log(`pid: ${proc.pid}`);
  log(`pid is number: ${typeof proc.pid === "number"}`);
  
  // Kill it immediately
  proc.kill("SIGTERM");
  
  // Wait for it to exit
  const status = await proc.status;
  
  log(`success: ${status.success}`);
  log(`signal: ${status.signal}`);
  log(`code: ${status.code}`);
  
  // Process should have been terminated by signal
  if (!status.success && status.signal === "SIGTERM") {
    log("spawn-kill: pass");
  } else {
    log("spawn-kill: FAIL");
  }
}
