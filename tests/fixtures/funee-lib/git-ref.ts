import { log, isGitRef, getNameOfRef } from "funee";

export default function() {
  // Test valid branch ref
  const branchRef = "refs/heads/main";
  log(`isGitRef branch: ${isGitRef(branchRef) ? "pass" : "fail"}`);
  
  if (isGitRef(branchRef)) {
    const name = getNameOfRef(branchRef);
    log(`branch name: ${name === "main" ? "pass" : "fail"}`);
  }
  
  // Test valid tag ref
  const tagRef = "refs/tags/v1.0.0";
  log(`isGitRef tag: ${isGitRef(tagRef) ? "pass" : "fail"}`);
  
  if (isGitRef(tagRef)) {
    const name = getNameOfRef(tagRef);
    log(`tag name: ${name === "v1.0.0" ? "pass" : "fail"}`);
  }
  
  // Test nested branch name with slashes
  const nestedRef = "refs/heads/feature/awesome/thing";
  log(`isGitRef nested: ${isGitRef(nestedRef) ? "pass" : "fail"}`);
  
  if (isGitRef(nestedRef)) {
    const name = getNameOfRef(nestedRef);
    log(`nested name: ${name === "feature/awesome/thing" ? "pass" : "fail"}`);
  }
  
  // Test invalid ref
  const invalidRef = "not-a-ref";
  log(`isGitRef invalid: ${!isGitRef(invalidRef) ? "pass" : "fail"}`);
  
  // Test another invalid format
  const invalidRef2 = "refs/remotes/origin/main";
  log(`isGitRef remotes: ${!isGitRef(invalidRef2) ? "pass" : "fail"}`);
  
  log("git ref test complete");
}
