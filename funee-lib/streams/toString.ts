/**
 * Collects all string chunks from an async iterable into a single string.
 * 
 * @example
 * ```typescript
 * const chunks = (async function*() {
 *   yield "hello ";
 *   yield "world";
 * })();
 * const str = await toString(chunks);
 * // str === "hello world"
 * ```
 */
export const toString = async function(
  iterable: AsyncIterable<string>
): Promise<string> {
  const parts: string[] = [];
  
  for await (const chunk of iterable) {
    parts.push(chunk);
  }
  
  return parts.join("");
};
