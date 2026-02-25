/**
 * Creates an async iterable that yields a single string.
 * Useful for creating a stream-like source from a string.
 * 
 * @example
 * ```typescript
 * const iterable = fromString("hello world");
 * for await (const chunk of iterable) {
 *   console.log(chunk); // "hello world"
 * }
 * ```
 */
export const fromString = async function*(
  str: string
): AsyncIterableIterator<string> {
  yield str;
};
