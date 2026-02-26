/**
 * Check if a value is an async iterable
 */
const isAsyncIterable = function <T>(val: unknown): val is AsyncIterable<T> {
  return (
    val != null &&
    typeof val === "object" &&
    Symbol.asyncIterator in val
  );
};

/**
 * The actual filter generator implementation
 */
const filterGen = async function* <T>(
  src: AsyncIterable<T>,
  predicate: (t: T, index: number) => Promise<boolean> | boolean
): AsyncIterable<T> {
  let i = 0;
  for await (const item of src) {
    if (await predicate(item, i++)) {
      yield item;
    }
  }
};

/**
 * Filters an async iterable based on a predicate function
 * 
 * Supports two calling conventions:
 * - Curried: filter(predicate)(source)
 * - Direct: filter(source, predicate)
 * 
 * @example
 * // Curried style
 * const evens = filter((x: number) => x % 2 === 0)(fromArray([1, 2, 3, 4]));
 * 
 * // Direct style  
 * const evens = filter(fromArray([1, 2, 3, 4]), (x: number) => x % 2 === 0);
 */
export const filter = function <T>(
  first: AsyncIterable<T> | ((t: T, index: number) => Promise<boolean> | boolean),
  second?: (t: T, index: number) => Promise<boolean> | boolean
): AsyncIterable<T> | ((source: AsyncIterable<T>) => AsyncIterable<T>) {
  // Direct style: filter(source, predicate)
  if (isAsyncIterable<T>(first) && second !== undefined) {
    return filterGen(first, second);
  }
  
  // Curried style: filter(predicate)(source)
  const predicate = first as (t: T, index: number) => Promise<boolean> | boolean;
  return function (src: AsyncIterable<T>): AsyncIterable<T> {
    return filterGen(src, predicate);
  };
};
