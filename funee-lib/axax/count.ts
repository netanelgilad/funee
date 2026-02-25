/**
 * Count the number of items in an async iterable
 */
export const count = async function <T>(source: AsyncIterable<T>): Promise<number> {
  let total = 0;
  for await (const _item of source) {
    total++;
  }
  return total;
};
