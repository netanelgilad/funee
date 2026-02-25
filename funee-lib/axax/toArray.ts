/**
 * Collects all items from an async iterable into an array
 */
export const toArray = async function <T>(source: AsyncIterable<T>): Promise<T[]> {
  const all: T[] = [];
  for await (const item of source) {
    all.push(item);
  }
  return all;
};
