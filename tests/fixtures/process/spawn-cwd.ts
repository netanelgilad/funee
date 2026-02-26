/**
 * Test: Set working directory for subprocess
 * 
 * Verifies that:
 * 1. cwd option changes the process working directory
 * 2. Commands run in the specified directory
 */
import { spawn, log } from "funee";

export default async function main() {
  // Run pwd in /tmp directory
  const result = await spawn({
    cmd: ["pwd"],
    cwd: "/tmp",
    stdout: "piped",
  });
  
  const output = await result.output();
  const cwd = output.stdoutText().trim();
  
  log(`cwd: ${cwd}`);
  log(`is /tmp: ${cwd === "/tmp" || cwd === "/private/tmp"}`);
  
  // macOS resolves /tmp to /private/tmp
  if (cwd === "/tmp" || cwd === "/private/tmp") {
    log("spawn-cwd: pass");
  } else {
    log("spawn-cwd: FAIL");
  }
}
