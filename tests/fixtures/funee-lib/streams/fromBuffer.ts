import { log, fromBuffer, toBuffer } from "funee";

export default async function () {
  // Test 1: Basic iteration
  const original = new Uint8Array([1, 2, 3, 4, 5]);
  let count = 0;
  for await (const chunk of fromBuffer(original)) {
    count++;
    log(`chunk length: ${chunk.length}`);
    log(`chunk data: ${Array.from(chunk).join(",")}`);
  }
  log(`count: ${count}`);

  // Test 2: Roundtrip
  const roundtrip = await toBuffer(fromBuffer(new Uint8Array([10, 20, 30])));
  log(`roundtrip: ${Array.from(roundtrip).join(",")}`);
}
