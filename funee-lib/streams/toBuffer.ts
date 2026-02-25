/**
 * Collects all chunks from an async iterable into a single Uint8Array.
 * 
 * @example
 * ```typescript
 * const chunks = (async function*() {
 *   yield new Uint8Array([1, 2, 3]);
 *   yield new Uint8Array([4, 5, 6]);
 * })();
 * const buffer = await toBuffer(chunks);
 * // buffer is Uint8Array [1, 2, 3, 4, 5, 6]
 * ```
 */
export const toBuffer = async function(
  iterable: AsyncIterable<Uint8Array>
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;
  
  for await (const chunk of iterable) {
    chunks.push(chunk);
    totalLength += chunk.length;
  }
  
  // Concatenate all chunks into a single Uint8Array
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
};
