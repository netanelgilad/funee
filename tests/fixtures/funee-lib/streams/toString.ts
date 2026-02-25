import { log, toString, fromString } from "funee";

export default async function () {
  // Test 1: String chunks
  const stringIter = (async function* () {
    yield "hello ";
    yield "world";
  })();
  const result1 = await toString(stringIter);
  log(`string chunks: ${result1}`);

  // Test 2: fromString -> toString roundtrip
  const result2 = await toString(fromString("roundtrip test"));
  log(`roundtrip: ${result2}`);

  // Test 3: Empty iterable
  const emptyIter = (async function* (): AsyncIterableIterator<string> {})();
  const result3 = await toString(emptyIter);
  log(`empty: "${result3}"`);
}
