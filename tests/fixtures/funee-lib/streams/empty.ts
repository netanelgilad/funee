import { log, empty, toArray, toString, toBuffer } from "funee";

export default async function () {
  // Test 1: Empty yields nothing
  const arr = await toArray(empty());
  log(`array length: ${arr.length}`);

  // Test 2: toString on empty
  const str = await toString(empty());
  log(`string: "${str}"`);

  // Test 3: toBuffer on empty  
  const buf = await toBuffer(empty());
  log(`buffer length: ${buf.length}`);
}
