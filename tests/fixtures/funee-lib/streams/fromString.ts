import { log, fromString, toString } from "funee";

export default async function () {
  // Test 1: Basic string iteration
  let count = 0;
  for await (const chunk of fromString("hello")) {
    count++;
    log(`chunk: ${chunk}`);
  }
  log(`count: ${count}`);

  // Test 2: Roundtrip
  const roundtrip = await toString(fromString("test string"));
  log(`roundtrip: ${roundtrip}`);
}
