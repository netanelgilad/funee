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
 * The actual mapping generator implementation
 */
const mapGen = async function* <TFrom, TTo>(
  src: AsyncIterable<TFrom>,
  fn: (t: TFrom, index: number) => Promise<TTo> | TTo
): AsyncIterable<TTo> {
  let i = 0;
  for await (const item of src) {
    yield await fn(item, i++);
  }
};

/**
 * Runs a mapping function over an asynchronous iterable
 * 
 * Supports two calling conventions:
 * - Curried: map(mapper)(source)
 * - Direct: map(source, mapper)
 * 
 * @example
 * // Curried style
 * const doubled = map((x: number) => x * 2)(fromArray([1, 2, 3]));
 * 
 * // Direct style  
 * const doubled = map(fromArray([1, 2, 3]), (x: number) => x * 2);
 */
export const map = function <TFrom, TTo>(
  first: AsyncIterable<TFrom> | ((t: TFrom, index: number) => Promise<TTo> | TTo),
  second?: (t: TFrom, index: number) => Promise<TTo> | TTo
): AsyncIterable<TTo> | ((source: AsyncIterable<TFrom>) => AsyncIterable<TTo>) {
  // Direct style: map(source, mapper)
  if (isAsyncIterable<TFrom>(first) && second !== undefined) {
    return mapGen(first, second);
  }
  
  // Curried style: map(mapper)(source)
  const fn = first as (t: TFrom, index: number) => Promise<TTo> | TTo;
  return function (src: AsyncIterable<TFrom>): AsyncIterable<TTo> {
    return mapGen(src, fn);
  };
};
