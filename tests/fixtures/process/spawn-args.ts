/**
 * Test: Pass arguments to subprocess
 * 
 * Verifies that:
 * 1. Arguments are passed correctly to the command
 * 2. Arguments with spaces are handled properly
 * 3. Multiple arguments work correctly
 */
import { spawn, log } from "funee";

export default async function main() {
  // Test 1: Multiple arguments
  const result1 = await spawn("echo", ["one", "two", "three"]);
  const text1 = result1.stdoutText().trim();
  log(`multiple args: "${text1}"`);
  
  // Test 2: Argument with spaces (should be treated as single arg)
  const result2 = await spawn("echo", ["hello world"]);
  const text2 = result2.stdoutText().trim();
  log(`arg with space: "${text2}"`);
  
  // Test 3: Arguments in cmd array (full options form)
  const proc = spawn({
    cmd: ["echo", "from", "cmd", "array"],
    stdout: "piped",
  });
  const output = await proc.output();
  const text3 = output.stdoutText().trim();
  log(`cmd array args: "${text3}"`);
  
  // Test 4: Special characters in arguments
  const result4 = await spawn("echo", ["$HOME", "&&", "test"]);
  const text4 = result4.stdoutText().trim();
  // echo should output the literal strings since not going through shell
  log(`special chars: "${text4}"`);
  
  if (text1 === "one two three" && text3 === "from cmd array") {
    log("spawn-args: pass");
  } else {
    log("spawn-args: FAIL");
  }
}
