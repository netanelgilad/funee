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
 * The actual reduce implementation
 */
const reduceImpl = async function <T, A>(
  source: AsyncIterable<T>,
  reducer: (accumulator: A, next: T) => Promise<A> | A,
  init: Promise<A> | A
): Promise<A> {
  let accumulator = await init;
  for await (const next of source) {
    accumulator = await reducer(accumulator, next);
  }
  return accumulator;
};

/**
 * Reduces an async iterable to a single value
 * 
 * Supports two calling conventions:
 * - Curried: reduce(reducer, init)(source)
 * - Direct: reduce(source, reducer, init)
 * 
 * @example
 * // Curried style
 * const sum = await reduce((acc, x) => acc + x, 0)(fromArray([1, 2, 3]));
 * 
 * // Direct style
 * const sum = await reduce(fromArray([1, 2, 3]), (acc, x) => acc + x, 0);
 */
export const reduce = function <T, A>(
  first: AsyncIterable<T> | ((accumulator: A, next: T) => Promise<A> | A),
  second?: ((accumulator: A, next: T) => Promise<A> | A) | (Promise<A> | A),
  third?: Promise<A> | A
): Promise<A> | ((source: AsyncIterable<T>) => Promise<A>) {
  // Direct style: reduce(source, reducer, init)
  if (isAsyncIterable<T>(first) && typeof second === "function" && third !== undefined) {
    return reduceImpl(
      first,
      second as (accumulator: A, next: T) => Promise<A> | A,
      third
    );
  }
  
  // Curried style: reduce(reducer, init)(source)
  const reducer = first as (accumulator: A, next: T) => Promise<A> | A;
  const init = second as Promise<A> | A;
  return function (source: AsyncIterable<T>): Promise<A> {
    return reduceImpl(source, reducer, init);
  };
};
