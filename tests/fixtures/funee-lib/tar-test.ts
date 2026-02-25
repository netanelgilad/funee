/**
 * Test tar archive creation and extraction
 */
import { 
  log, 
  createTar, 
  extractFromBuffer,
  encodeHeader,
  decodeHeader,
  encodeString,
  decodeString,
} from "funee";

export default async () => {
  // Test 1: encodeHeader and decodeHeader roundtrip
  const header = encodeHeader({
    name: "test.txt",
    mode: parseInt("644", 8),
    uid: 0,
    gid: 0,
    size: 5,
    mtime: new Date(1000000000000),
    type: "file",
  });
  
  if (!header) {
    log("encodeHeader: FAIL - returned null");
    return;
  }
  log(`encodeHeader: ${header.length === 512 ? "pass" : "FAIL"}`);
  
  const decoded = decodeHeader(header);
  if (!decoded) {
    log("decodeHeader: FAIL - returned null");
    return;
  }
  log(`decodeHeader name: ${decoded.name === "test.txt" ? "pass" : "FAIL - " + decoded.name}`);
  log(`decodeHeader size: ${decoded.size === 5 ? "pass" : "FAIL - " + decoded.size}`);
  log(`decodeHeader type: ${decoded.type === "file" ? "pass" : "FAIL - " + decoded.type}`);
  
  // Test 2: Create and extract a simple tar archive
  const tar = createTar([
    { name: "hello.txt", data: encodeString("Hello!") },
    { name: "world.txt", data: encodeString("World!") },
  ]);
  
  log(`createTar: ${tar.length > 0 ? "pass" : "FAIL"}`);
  log(`createTar size: ${tar.length}`);
  
  const entries = await extractFromBuffer(tar);
  log(`extractFromBuffer count: ${entries.length === 2 ? "pass" : "FAIL - " + entries.length}`);
  
  const [first, second] = entries;
  log(`entry 1 name: ${first.entry.name === "hello.txt" ? "pass" : "FAIL - " + first.entry.name}`);
  log(`entry 1 data: ${decodeString(first.data) === "Hello!" ? "pass" : "FAIL"}`);
  log(`entry 2 name: ${second.entry.name === "world.txt" ? "pass" : "FAIL - " + second.entry.name}`);
  log(`entry 2 data: ${decodeString(second.data) === "World!" ? "pass" : "FAIL"}`);
  
  // Test 3: Directory entries
  const tarWithDir = createTar([
    { name: "mydir/", type: "directory" },
    { name: "mydir/file.txt", data: encodeString("Inside dir") },
  ]);
  
  const dirEntries = await extractFromBuffer(tarWithDir);
  log(`dir entry count: ${dirEntries.length === 2 ? "pass" : "FAIL - " + dirEntries.length}`);
  log(`dir entry type: ${dirEntries[0].entry.type === "directory" ? "pass" : "FAIL - " + dirEntries[0].entry.type}`);
  log(`dir entry name: ${dirEntries[0].entry.name === "mydir/" ? "pass" : "FAIL - " + dirEntries[0].entry.name}`);
  
  // Test 4: Large file (to test padding)
  const largeData = new Uint8Array(1000);
  for (let i = 0; i < 1000; i++) {
    largeData[i] = i % 256;
  }
  
  const tarLarge = createTar([
    { name: "large.bin", data: largeData },
  ]);
  
  const largeEntries = await extractFromBuffer(tarLarge);
  log(`large file size: ${largeEntries[0].data.length === 1000 ? "pass" : "FAIL - " + largeEntries[0].data.length}`);
  
  // Verify data integrity
  let allMatch = true;
  for (let i = 0; i < 1000; i++) {
    if (largeEntries[0].data[i] !== i % 256) {
      allMatch = false;
      break;
    }
  }
  log(`large file integrity: ${allMatch ? "pass" : "FAIL"}`);
  
  // Test 5: Empty file
  const tarEmpty = createTar([
    { name: "empty.txt", data: new Uint8Array(0) },
  ]);
  
  const emptyEntries = await extractFromBuffer(tarEmpty);
  log(`empty file: ${emptyEntries[0].data.length === 0 ? "pass" : "FAIL"}`);
  
  log("tar test complete");
};
