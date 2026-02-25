/**
 * Creates an async iterable that yields a single Uint8Array.
 * Useful for creating a stream-like source from binary data.
 * 
 * @example
 * ```typescript
 * const iterable = fromBuffer(new Uint8Array([1, 2, 3, 4]));
 * for await (const chunk of iterable) {
 *   console.log(chunk); // Uint8Array [1, 2, 3, 4]
 * }
 * ```
 */
export const fromBuffer = async function*(
  buffer: Uint8Array
): AsyncIterableIterator<Uint8Array> {
  yield buffer;
};
