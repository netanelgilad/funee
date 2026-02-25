/**
 * Extract files from a tar archive
 * 
 * Parses a tar archive from an async iterable of Uint8Array chunks
 * and yields each file entry with its header and data.
 */

import type { TarEntry, TarHeader } from "./types.ts";
import { decodeHeader } from "./decodeHeader.ts";

/**
 * Concatenate multiple Uint8Arrays into one
 */
const concatUint8Arrays = (arrays: Uint8Array[]): Uint8Array => {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
};

/**
 * Calculate file overflow (padding to 512-byte boundary)
 */
const fileOverflow = (size: number): number => {
  size &= 511;
  return size ? 512 - size : 0;
};

/**
 * Collect data from an async iterator until a specified length is reached
 * Returns [collectedData, overflow]
 */
const collectLength = async (
  iterator: AsyncIterator<Uint8Array>,
  length: number,
  overflow: Uint8Array
): Promise<[Uint8Array, Uint8Array]> => {
  const buffers: Uint8Array[] = [];
  
  // Use overflow from previous operation first
  if (overflow.length > 0) {
    if (overflow.length >= length) {
      return [overflow.slice(0, length), overflow.slice(length)];
    }
    buffers.push(overflow);
    length -= overflow.length;
    overflow = new Uint8Array(0);
  }
  
  let seen = 0;
  while (seen < length) {
    const result = await iterator.next();
    if (result.done) {
      // Not enough data
      return [concatUint8Arrays(buffers), new Uint8Array(0)];
    }
    
    const chunk = result.value;
    const remaining = length - seen;
    
    if (chunk.length <= remaining) {
      buffers.push(chunk);
      seen += chunk.length;
    } else {
      // This chunk completes our collection with overflow
      buffers.push(chunk.slice(0, remaining));
      return [concatUint8Arrays(buffers), chunk.slice(remaining)];
    }
  }
  
  return [concatUint8Arrays(buffers), new Uint8Array(0)];
};

/**
 * Extract entries from a tar archive stream
 * 
 * @param tarStream - Async iterable of Uint8Array chunks
 * @yields TarEntry objects containing header and data for each file
 * 
 * @example
 * ```typescript
 * import { extract } from "funee";
 * import { fromBuffer } from "funee";
 * 
 * const tarData = readFileBinary("archive.tar");
 * for await (const { entry, data } of extract(fromBuffer(tarData))) {
 *   console.log(`${entry.name}: ${data.length} bytes`);
 * }
 * ```
 */
export const extract = async function* (
  tarStream: AsyncIterable<Uint8Array>
): AsyncGenerator<TarEntry> {
  const iterator = tarStream[Symbol.asyncIterator]();
  let overflow = new Uint8Array(0);
  
  while (true) {
    // Read 512-byte header
    const [headerData, newOverflow] = await collectLength(iterator, 512, overflow);
    overflow = newOverflow;
    
    if (headerData.length < 512) {
      // End of stream
      return;
    }
    
    // Decode header
    const header = decodeHeader(headerData);
    
    if (!header) {
      // Null header = end of archive (two consecutive null blocks)
      // Just continue to check for more entries or actual end
      continue;
    }
    
    if (header.type === "file") {
      // Read file data
      const fileSize = header.size;
      const paddedSize = fileSize + fileOverflow(fileSize);
      
      const [paddedData, fileOverflowData] = await collectLength(iterator, paddedSize, overflow);
      overflow = fileOverflowData;
      
      // Trim padding from file data
      const fileData = paddedData.slice(0, fileSize);
      
      yield { entry: header, data: fileData };
    } else if (header.type === "directory") {
      // Directories have no data
      yield { entry: header, data: new Uint8Array(0) };
    }
    // Other types (symlinks, etc.) are skipped for now
  }
};

/**
 * Extract a tar archive from a Uint8Array
 * 
 * Convenience function that wraps extract() for a single buffer input.
 * 
 * @param tarData - Complete tar archive as Uint8Array
 * @returns Array of TarEntry objects
 * 
 * @example
 * ```typescript
 * const entries = await extractFromBuffer(tarData);
 * for (const { entry, data } of entries) {
 *   console.log(entry.name);
 * }
 * ```
 */
export const extractFromBuffer = async (tarData: Uint8Array): Promise<TarEntry[]> => {
  const entries: TarEntry[] = [];
  const stream = (async function* () {
    yield tarData;
  })();
  
  for await (const entry of extract(stream)) {
    entries.push(entry);
  }
  
  return entries;
};
