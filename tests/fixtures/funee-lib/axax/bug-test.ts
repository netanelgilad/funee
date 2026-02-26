import { log, fromArray, toArray, map, filter, reduce } from "funee";

export default async function () {
  // Test map with both calling conventions
  log("Testing map...");
  
  // Direct style (the bug): map(source, mapper)
  const mapDirect = await toArray(
    map(fromArray([1, 2, 3]), (n: number) => n * 2)
  );
  log(`map direct: ${JSON.stringify(mapDirect)}`);
  
  // Curried style: map(mapper)(source)
  const mapCurried = await toArray(
    map((n: number) => n * 2)(fromArray([1, 2, 3]))
  );
  log(`map curried: ${JSON.stringify(mapCurried)}`);
  
  // Test filter with both calling conventions
  log("Testing filter...");
  
  // Direct style: filter(source, predicate)
  const filterDirect = await toArray(
    filter(fromArray([1, 2, 3, 4, 5, 6]), (n: number) => n % 2 === 0)
  );
  log(`filter direct: ${JSON.stringify(filterDirect)}`);
  
  // Curried style: filter(predicate)(source)
  const filterCurried = await toArray(
    filter((n: number) => n % 2 === 0)(fromArray([1, 2, 3, 4, 5, 6]))
  );
  log(`filter curried: ${JSON.stringify(filterCurried)}`);
  
  // Test reduce with both calling conventions
  log("Testing reduce...");
  
  // Direct style: reduce(source, reducer, init)
  const reduceDirect = await reduce(fromArray([1, 2, 3, 4, 5]), (acc: number, x: number) => acc + x, 0);
  log(`reduce direct: ${reduceDirect}`);
  
  // Curried style: reduce(reducer, init)(source)
  const reduceCurried = await reduce((acc: number, x: number) => acc + x, 0)(fromArray([1, 2, 3, 4, 5]));
  log(`reduce curried: ${reduceCurried}`);
  
  log("All tests passed!");
}
