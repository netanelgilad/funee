import { log, fromArray, toArray } from "funee";

export default async function () {
  const arr = [1, 2, 3, 4, 5];
  const iter = fromArray(arr);
  const result = await toArray(iter);
  log(`result: ${JSON.stringify(result)}`);
}
