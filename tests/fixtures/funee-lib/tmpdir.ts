import { log, tmpdir } from "funee";

// Test tmpdir utility
export default () => {
  const temp = tmpdir();
  
  // Should return a non-empty string
  log(`tmpdir is string: ${typeof temp === "string" ? "pass" : "fail"}`);
  log(`tmpdir is non-empty: ${temp.length > 0 ? "pass" : "fail"}`);
  
  // Should start with / on Unix or contain : on Windows
  const isValidPath = temp.startsWith("/") || temp.includes(":");
  log(`tmpdir is valid path: ${isValidPath ? "pass" : "fail"}`);
  
  log("tmpdir test complete");
};
