import { log, fromArray, reduce } from "funee";

export default async function () {
  const arr = [1, 2, 3, 4, 5];
  const sum = await reduce((acc: number, x: number) => acc + x, 0)(fromArray(arr));
  log(`sum: ${sum}`);
  
  // Test with async reducer
  const asyncSum = await reduce(
    async (acc: number, x: number) => acc + x,
    Promise.resolve(10)
  )(fromArray(arr));
  log(`asyncSum: ${asyncSum}`);
}
