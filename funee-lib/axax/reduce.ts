/**
 * Reduces an async iterable to a single value
 */
export const reduce = function <T, A>(
  reducer: (accumulator: A, next: T) => Promise<A> | A,
  init: Promise<A> | A
) {
  return async function inner(source: AsyncIterable<T>) {
    let accumulator = await init;
    for await (const next of source) {
      accumulator = await reducer(accumulator, next);
    }
    return accumulator;
  };
};
