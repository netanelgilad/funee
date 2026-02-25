import { log, someDirectory, tmpdir } from "funee";

// Test someDirectory utility
export default () => {
  const dir1 = someDirectory();
  const temp = tmpdir();
  
  // Should be a string
  log(`is string: ${typeof dir1 === "string" ? "pass" : "fail"}`);
  
  // Should start with the temp directory
  log(`starts with tmpdir: ${dir1.startsWith(temp) ? "pass" : "fail"}`);
  
  // Should contain funee_ prefix in the last segment
  log(`contains funee prefix: ${dir1.includes("funee_") ? "pass" : "fail"}`);
  
  // Should generate unique paths
  const dir2 = someDirectory();
  log(`unique: ${dir1 !== dir2 ? "pass" : "fail"}`);
  
  log("someDirectory test complete");
};
