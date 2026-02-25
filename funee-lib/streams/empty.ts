/**
 * Creates an empty async iterable that completes immediately.
 * Useful as a no-op stream or for testing.
 * 
 * @example
 * ```typescript
 * const iterable = empty();
 * const chunks = [];
 * for await (const chunk of iterable) {
 *   chunks.push(chunk);
 * }
 * // chunks === []
 * ```
 */
export const empty = async function*<T = never>(): AsyncIterableIterator<T> {
  // Yields nothing, completes immediately
};
