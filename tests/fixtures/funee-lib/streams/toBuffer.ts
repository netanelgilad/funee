import { log, toBuffer, fromBuffer } from "funee";

export default async function () {
  // Test 1: Collect multiple chunks
  const iter1 = (async function* () {
    yield new Uint8Array([1, 2, 3]);
    yield new Uint8Array([4, 5, 6]);
  })();
  const buf1 = await toBuffer(iter1);
  log(`collected: ${Array.from(buf1).join(",")}`);

  // Test 2: fromBuffer -> toBuffer roundtrip
  const original = new Uint8Array([10, 20, 30]);
  const buf2 = await toBuffer(fromBuffer(original));
  log(`roundtrip: ${Array.from(buf2).join(",")}`);

  // Test 3: Empty iterable
  const emptyIter = (async function* (): AsyncIterableIterator<Uint8Array> {})();
  const buf3 = await toBuffer(emptyIter);
  log(`empty length: ${buf3.length}`);
}
