/**
 * Test: Write to subprocess stdin
 * 
 * Verifies that:
 * 1. stdin can be piped to subprocess
 * 2. writeInput() sends data to process
 * 3. Process receives and processes the input
 */
import { spawn, log } from "funee";

export default async function main() {
  // Use cat to echo back our input
  const proc = spawn({
    cmd: ["cat"],
    stdin: "piped",
    stdout: "piped",
  });
  
  // Write to stdin
  await proc.writeInput("hello from stdin");
  
  // Get output
  const output = await proc.output();
  const text = output.stdoutText();
  
  log(`output: "${text}"`);
  log(`matches input: ${text === "hello from stdin"}`);
  
  if (text === "hello from stdin") {
    log("spawn-stdin: pass");
  } else {
    log("spawn-stdin: FAIL");
  }
}
