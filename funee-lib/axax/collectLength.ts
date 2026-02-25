/**
 * Result type for collectLength - buffers collected and any overflow
 */
export type CollectLengthResult = [Buffer[], Buffer];

/**
 * Collects data from an async iterator until a specified length is reached.
 * Returns a tuple of [collectedBuffers, overflow].
 * The overflow is any data beyond the requested length.
 */
export const collectLength = async function (
  iterator: AsyncIterableIterator<Buffer>,
  length: number
): Promise<CollectLengthResult> {
  let current = await iterator.next();
  const buffers: Buffer[] = [];
  let seen = 0;
  while (!current.done) {
    seen += current.value.length;

    if (seen < length) {
      buffers.push(current.value);
    } else {
      buffers.push(
        current.value.slice(0, length - seen + current.value.length)
      );
      const overflow = current.value.slice(
        length - seen + current.value.length
      );
      return [buffers, overflow];
    }
    current = await iterator.next();
  }
  return [buffers, Buffer.from([])];
};
