import { log, fromArray, toArray, filter } from "funee";

export default async function () {
  const arr = [1, 2, 3, 4, 5, 6];
  
  // Curried style
  const evens = filter((x: number) => x % 2 === 0)(fromArray(arr));
  const evenResult = await toArray(evens);
  log(`evens (curried): ${JSON.stringify(evenResult)}`);
  
  // Direct style
  const odds = await toArray(
    filter(fromArray(arr), (x: number) => x % 2 === 1)
  );
  log(`odds (direct): ${JSON.stringify(odds)}`);
  
  // Async predicate
  const gtTwo = await toArray(
    filter((x: number) => Promise.resolve(x > 2))(fromArray(arr))
  );
  log(`gtTwo: ${JSON.stringify(gtTwo)}`);
}
