import { log, fromArray, toArray, map } from "funee";

export default async function () {
  const arr = [1, 2, 3];
  const doubled = map((x: number) => x * 2)(fromArray(arr));
  const result = await toArray(doubled);
  log(`doubled: ${JSON.stringify(result)}`);
  
  // Test with index
  const withIndex = map((x: number, i: number) => `${i}:${x}`)(fromArray(arr));
  const indexResult = await toArray(withIndex);
  log(`withIndex: ${JSON.stringify(indexResult)}`);
}
