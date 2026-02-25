import { log, fromArray, merge, toArray } from "funee";

export default async function () {
  const iter1 = fromArray([1, 2, 3]);
  const iter2 = fromArray([4, 5, 6]);
  
  const merged = merge(iter1, iter2);
  const result = await toArray(merged);
  
  // Sort to ensure consistent output (merge order is not guaranteed)
  result.sort((a, b) => a - b);
  log(`merged: ${JSON.stringify(result)}`);
}
