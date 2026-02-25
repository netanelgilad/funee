import { watchFile, watchDirectory, log, writeFile, tmpdir, someString } from "funee";
import { fsMkdir } from "funee";

export default async () => {
  // Test 1: Setup test directory
  const testDir = `${tmpdir()}/funee-watcher-test-${someString(8)}`;
  const testFile = `${testDir}/test.txt`;
  
  // Create test directory
  const mkdirResult = JSON.parse(fsMkdir(testDir));
  if (mkdirResult.type === "error") {
    log(`mkdir failed: ${mkdirResult.error}`);
    return;
  }
  log("test directory created: pass");
  
  // Test 2: Watch directory can be created and stopped
  // Note: We watch the directory first since the file doesn't exist yet
  log("creating directory watcher...");
  const dirWatcher = watchDirectory(testDir, { recursive: true });
  log("directory watcher created: pass");
  
  dirWatcher.stop();
  log("directory watcher stopped: pass");
  
  // Test 3: Watch directory without recursive option
  log("creating non-recursive directory watcher...");
  const nonRecursiveWatcher = watchDirectory(testDir);
  log("non-recursive watcher created: pass");
  
  nonRecursiveWatcher.stop();
  log("non-recursive watcher stopped: pass");
  
  // Test 4: Create a file first, then watch it
  writeFile(testFile, "initial content");
  log("wrote initial content");
  
  log("creating file watcher...");
  const fileWatcher = watchFile(testFile);
  log("file watcher created: pass");
  
  // Stop immediately (no events to process)
  fileWatcher.stop();
  log("file watcher stopped: pass");
  
  // Test 5: Multiple watchers can coexist
  log("testing multiple watchers...");
  const watcher1 = watchDirectory(testDir);
  const watcher2 = watchDirectory(testDir, { recursive: true });
  log("multiple watchers created: pass");
  
  watcher1.stop();
  watcher2.stop();
  log("multiple watchers stopped: pass");
  
  log("watcher test complete");
};
