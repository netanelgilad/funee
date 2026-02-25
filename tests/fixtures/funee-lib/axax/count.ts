import { log, fromArray, count } from "funee";

export default async function () {
  const arr = [1, 2, 3, 4, 5];
  const total = await count(fromArray(arr));
  log(`count: ${total}`);
  
  const empty = await count(fromArray([]));
  log(`empty count: ${empty}`);
}
