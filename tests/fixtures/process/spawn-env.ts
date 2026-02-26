/**
 * Test: Set environment variables for subprocess
 * 
 * Verifies that:
 * 1. env option sets custom environment variables
 * 2. Process can access the environment variables
 * 3. inheritEnv controls whether parent env is included
 */
import { spawn, log } from "funee";

export default async () => {
  // Test 1: Set custom env var
  const result1 = await spawn({
    cmd: ["sh", "-c", "echo $MY_VAR"],
    env: { MY_VAR: "custom_value" },
    stdout: "piped",
  });
  
  const output1 = await result1.output();
  const value1 = output1.stdoutText().trim();
  log(`custom env var: ${value1}`);
  
  // Test 2: inheritEnv: false should not have PATH
  const result2 = await spawn({
    cmd: ["sh", "-c", "echo PATH=$PATH"],
    env: { MY_VAR: "test" },
    inheritEnv: false,
    stdout: "piped",
  });
  
  const output2 = await result2.output();
  const value2 = output2.stdoutText().trim();
  log(`inheritEnv false, PATH: ${value2}`);
  
  // Test 3: inheritEnv: true (default) should have PATH
  const result3 = await spawn({
    cmd: ["sh", "-c", "echo PATH_EXISTS=$PATH"],
    env: { MY_VAR: "test" },
    inheritEnv: true,
    stdout: "piped",
  });
  
  const output3 = await result3.output();
  const value3 = output3.stdoutText().trim();
  const hasPath = value3.includes("/usr") || value3.includes("/bin");
  log(`inheritEnv true, has PATH: ${hasPath}`);
  
  if (value1 === "custom_value" && hasPath) {
    log("spawn-env: pass");
  } else {
    log("spawn-env: FAIL");
  }
}
