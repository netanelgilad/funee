/**
 * Creates an async iterable from an array
 */
export const fromArray = async function* <T>(values: T[]) {
  for (const item of values) {
    yield item;
  }
};
