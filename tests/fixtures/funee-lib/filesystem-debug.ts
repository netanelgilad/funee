import {
  log,
  readFile,
  readFileRaw,
  writeFile,
  isFile,
  lstat,
  lstatRaw,
  readdir,
  readdirRaw,
  join,
  FilePathString,
  FolderPathString,
  PathString,
} from "funee";

export default function() {
  const testDir = "/tmp/funee-fs-test";
  const testFile = join(testDir, "test.txt") as FilePathString;
  const testContent = "Hello from funee!";
  
  // Debug writeFile
  log("=== writeFile debug ===");
  const writeResult = writeFile(testFile, testContent);
  log("writeFile returned");
  
  // Debug readFileRaw
  log("=== readFile debug ===");
  const readRaw = readFileRaw(testFile as PathString);
  log("readFileRaw result type: " + readRaw.type);
  if (readRaw.type === "ok") {
    log("readFileRaw value: [" + readRaw.value + "]");
    log("expected: [" + testContent + "]");
    log("equal: " + (readRaw.value === testContent));
  } else {
    log("readFileRaw error: " + readRaw.error);
  }
  
  // Debug lstatRaw
  log("=== lstat debug ===");
  const lstatResult = lstatRaw(testFile as PathString);
  log("lstatRaw result type: " + lstatResult.type);
  if (lstatResult.type === "ok") {
    log("size: " + lstatResult.value.size);
    log("is_file: " + lstatResult.value.is_file);
    log("is_directory: " + lstatResult.value.is_directory);
    log("modified_ms: " + lstatResult.value.modified_ms);
    log("modified_ms type: " + typeof lstatResult.value.modified_ms);
  } else {
    log("lstatRaw error: " + lstatResult.error);
  }
  
  // Debug readdirRaw  
  log("=== readdir debug ===");
  const readdirResult = readdirRaw(testDir as PathString);
  log("readdirRaw result type: " + readdirResult.type);
  if (readdirResult.type === "ok") {
    log("readdirRaw value length: " + readdirResult.value.length);
    log("is array: " + Array.isArray(readdirResult.value));
    for (let i = 0; i < readdirResult.value.length; i++) {
      log("  [" + i + "]: " + readdirResult.value[i]);
    }
  } else {
    log("readdirRaw error: " + readdirResult.error);
  }
  
  log("=== debug complete ===");
}
