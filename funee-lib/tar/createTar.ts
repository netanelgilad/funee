/**
 * Create a tar archive
 * 
 * Creates a tar archive from a list of entries.
 */

import type { TarFileType } from "./types.ts";
import { encodeHeader } from "./encodeHeader.ts";

/**
 * Entry to add to a tar archive
 */
export interface TarInput {
  /** Name/path of the file in the archive */
  name: string;
  /** File data (for files) */
  data?: Uint8Array;
  /** File type (defaults to "file") */
  type?: TarFileType;
  /** File mode (defaults to 0o644 for files, 0o755 for directories) */
  mode?: number;
  /** User ID (defaults to 0) */
  uid?: number;
  /** Group ID (defaults to 0) */
  gid?: number;
  /** Modification time (defaults to now) */
  mtime?: Date;
}

const END_OF_TAR = new Uint8Array(1024); // Two 512-byte null blocks
const DEFAULT_FILE_MODE = parseInt("644", 8);
const DEFAULT_DIR_MODE = parseInt("755", 8);

/**
 * Calculate padding to 512-byte boundary
 */
const overflow = (size: number): number => {
  size &= 511;
  return size ? 512 - size : 0;
};

/**
 * Concatenate multiple Uint8Arrays
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
 * Create a tar archive from entries
 * 
 * @param entries - Array of entries to add to the archive
 * @returns Complete tar archive as Uint8Array
 * 
 * @example
 * ```typescript
 * const tar = createTar([
 *   { name: "hello.txt", data: new TextEncoder().encode("Hello!") },
 *   { name: "subdir/", type: "directory" },
 *   { name: "subdir/world.txt", data: new TextEncoder().encode("World!") },
 * ]);
 * ```
 */
export const createTar = (entries: TarInput[]): Uint8Array => {
  const parts: Uint8Array[] = [];
  
  for (const entry of entries) {
    const type = entry.type || "file";
    const isDir = type === "directory";
    const data = entry.data || new Uint8Array(0);
    const mode = entry.mode ?? (isDir ? DEFAULT_DIR_MODE : DEFAULT_FILE_MODE);
    
    const header = encodeHeader({
      name: entry.name,
      size: isDir ? 0 : data.length,
      type,
      mode,
      uid: entry.uid ?? 0,
      gid: entry.gid ?? 0,
      mtime: entry.mtime ?? new Date(),
    });
    
    if (!header) {
      throw new Error(`Failed to encode header for: ${entry.name}`);
    }
    
    parts.push(header);
    
    if (!isDir && data.length > 0) {
      parts.push(data);
      
      // Add padding to 512-byte boundary
      const padding = overflow(data.length);
      if (padding > 0) {
        parts.push(new Uint8Array(padding));
      }
    }
  }
  
  // Add end-of-archive marker (two null blocks)
  parts.push(END_OF_TAR);
  
  return concatUint8Arrays(parts);
};

/**
 * Create a tar archive as an async iterable
 * 
 * Useful for streaming large archives without holding everything in memory.
 * 
 * @param entries - Array of entries to add to the archive
 * @yields Uint8Array chunks of the tar archive
 * 
 * @example
 * ```typescript
 * for await (const chunk of createTarStream(entries)) {
 *   // Write chunk to file or network
 * }
 * ```
 */
export const createTarStream = async function* (
  entries: TarInput[]
): AsyncGenerator<Uint8Array> {
  for (const entry of entries) {
    const type = entry.type || "file";
    const isDir = type === "directory";
    const data = entry.data || new Uint8Array(0);
    const mode = entry.mode ?? (isDir ? DEFAULT_DIR_MODE : DEFAULT_FILE_MODE);
    
    const header = encodeHeader({
      name: entry.name,
      size: isDir ? 0 : data.length,
      type,
      mode,
      uid: entry.uid ?? 0,
      gid: entry.gid ?? 0,
      mtime: entry.mtime ?? new Date(),
    });
    
    if (!header) {
      throw new Error(`Failed to encode header for: ${entry.name}`);
    }
    
    yield header;
    
    if (!isDir && data.length > 0) {
      yield data;
      
      // Add padding to 512-byte boundary
      const padding = overflow(data.length);
      if (padding > 0) {
        yield new Uint8Array(padding);
      }
    }
  }
  
  // Add end-of-archive marker
  yield END_OF_TAR;
};
