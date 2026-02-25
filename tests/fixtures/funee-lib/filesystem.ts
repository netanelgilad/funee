import {
  log,
  readFile,
  writeFile,
  isFile,
  lstat,
  readdir,
  join,
  FilePathString,
  FolderPathString,
} from "funee";

export default function() {
  const testDir = "/tmp/funee-fs-test";
  const testFile = join(testDir, "test.txt") as FilePathString;
  const markerFile = join(testDir, ".marker") as FilePathString;
  const testContent = "Hello from funee filesystem test!";
  
  // Test writeFile
  try {
    // First create the directory using writeFile on a marker file
    writeFile(markerFile, "");
    writeFile(testFile, testContent);
    log("writeFile: pass");
  } catch (e) {
    log("writeFile: fail - " + e);
  }
  
  // Test readFile
  try {
    const content = readFile(testFile);
    log(`readFile: ${content === testContent ? "pass" : "fail"}`);
  } catch (e) {
    log(`readFile: fail - ${e}`);
  }
  
  // Test isFile
  try {
    const fileResult = isFile(testFile as string);
    const dirResult = isFile(testDir as string);
    log(`isFile on file: ${fileResult ? "pass" : "fail"}`);
    log(`isFile on dir: ${!dirResult ? "pass" : "fail"}`);
  } catch (e) {
    log(`isFile: fail - ${e}`);
  }
  
  // Test lstat
  try {
    const stats = lstat(testFile as string);
    log(`lstat size: ${stats.size === testContent.length ? "pass" : "fail"}`);
    log(`lstat is_file: ${stats.is_file ? "pass" : "fail"}`);
    log(`lstat is_directory: ${!stats.is_directory ? "pass" : "fail"}`);
    log(`lstat has modified_ms: ${typeof stats.modified_ms === "number" ? "pass" : "fail"}`);
  } catch (e) {
    log(`lstat: fail - ${e}`);
  }
  
  // Test lstat on directory
  try {
    const stats = lstat(testDir as string);
    log(`lstat dir is_directory: ${stats.is_directory ? "pass" : "fail"}`);
    log(`lstat dir is_file: ${!stats.is_file ? "pass" : "fail"}`);
  } catch (e) {
    log(`lstat dir: fail - ${e}`);
  }
  
  // Test readdir
  try {
    const files = readdir(testDir as FolderPathString);
    const hasTestFile = files.includes("test.txt");
    const hasMarker = files.includes(".marker");
    log(`readdir contains test.txt: ${hasTestFile ? "pass" : "fail"}`);
    log(`readdir contains .marker: ${hasMarker ? "pass" : "fail"}`);
    log(`readdir returns array: ${Array.isArray(files) ? "pass" : "fail"}`);
  } catch (e) {
    log(`readdir: fail - ${e}`);
  }
  
  // Test join
  const joined = join("/home", "user");
  const joinResult = joined === "/home/user" ? "pass" : "fail";
  log("join: " + joinResult);
  
  // Test error handling for non-existent file
  try {
    readFile("/nonexistent/file/path.txt" as FilePathString);
    log("readFile nonexistent: fail (should have thrown)");
  } catch (e) {
    log("readFile nonexistent: pass (threw error)");
  }
  
  // Test error handling for non-existent directory
  try {
    readdir("/nonexistent/directory/path" as FolderPathString);
    log("readdir nonexistent: fail (should have thrown)");
  } catch (e) {
    log("readdir nonexistent: pass (threw error)");
  }
  
  log("filesystem test complete");
}
