/**
 * Test: tempDir disposable resource
 * 
 * Tests that tempDir() creates a temporary directory that is
 * automatically cleaned up when disposed.
 */
import { log, tempDir, writeFile, readFile, isFile, join, FilePathString, fsExists } from "funee";

export default async function() {
  // Test 1: tempDir creates a directory
  {
    const tmp = tempDir();
    const exists = fsExists(tmp.path);
    log(`creates directory: ${exists ? "pass" : "fail"}`);
    await tmp[Symbol.asyncDispose]();
  }
  
  // Test 2: tempDir has asyncDispose symbol
  {
    const tmp = tempDir();
    const hasAsyncDispose = Symbol.asyncDispose in tmp;
    log(`has asyncDispose: ${hasAsyncDispose ? "pass" : "fail"}`);
    await tmp[Symbol.asyncDispose]();
  }
  
  // Test 3: path is in temp directory
  {
    const tmp = tempDir();
    // On most systems, /tmp is the temp directory or it starts with /var/folders on macOS
    const isInTmp = tmp.path.includes("tmp") || tmp.path.includes("temp") || tmp.path.includes("Temp") || tmp.path.includes("folders");
    log(`path in temp: ${isInTmp ? "pass" : "fail"}`);
    await tmp[Symbol.asyncDispose]();
  }
  
  // Test 4: path contains funee_ prefix
  {
    const tmp = tempDir();
    const hasFuneePrefix = tmp.path.includes("funee_");
    log(`has funee prefix: ${hasFuneePrefix ? "pass" : "fail"}`);
    await tmp[Symbol.asyncDispose]();
  }
  
  // Test 5: Can write and read files in tempDir
  {
    const tmp = tempDir();
    const testFile = join(tmp.path, "test.txt") as FilePathString;
    writeFile(testFile, "hello temp");
    const content = readFile(testFile);
    log(`write/read works: ${content === "hello temp" ? "pass" : "fail"}`);
    await tmp[Symbol.asyncDispose]();
  }
  
  // Test 6: asyncDispose deletes the directory
  {
    const tmp = tempDir();
    const path = tmp.path;
    
    // Write a file to make sure deletion works
    const testFile = join(path, "test-file.txt") as FilePathString;
    writeFile(testFile, "test content");
    
    // Verify file exists
    const existsBefore = fsExists(testFile);
    log(`file exists before dispose: ${existsBefore ? "pass" : "fail"}`);
    
    // Dispose
    await tmp[Symbol.asyncDispose]();
    
    // Verify directory is gone
    const existsAfter = fsExists(path);
    log(`deleted after dispose: ${!existsAfter ? "pass" : "fail"}`);
  }
  
  // Test 7: Each tempDir gets unique path
  {
    const tmp1 = tempDir();
    const tmp2 = tempDir();
    log(`unique paths: ${tmp1.path !== tmp2.path ? "pass" : "fail"}`);
    await tmp1[Symbol.asyncDispose]();
    await tmp2[Symbol.asyncDispose]();
  }
  
  // Test 8: Simulate await using with try/finally
  {
    let savedPath = "";
    
    const tmp = tempDir();
    savedPath = tmp.path;
    
    try {
      const exists = fsExists(savedPath);
      log(`await using exists during: ${exists ? "pass" : "fail"}`);
    } finally {
      await tmp[Symbol.asyncDispose]();
    }
    
    const existsAfter = fsExists(savedPath);
    log(`await using cleaned after: ${!existsAfter ? "pass" : "fail"}`);
  }
  
  log("temp-dir test complete");
}
