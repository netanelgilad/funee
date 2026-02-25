/**
 * Tar archive utilities
 * 
 * This module provides functions for creating and extracting tar archives.
 * 
 * @example
 * ```typescript
 * import { createTar, extract, extractFromBuffer } from "funee";
 * 
 * // Create a tar archive
 * const tar = createTar([
 *   { name: "hello.txt", data: new TextEncoder().encode("Hello!") },
 *   { name: "dir/", type: "directory" },
 * ]);
 * 
 * // Extract a tar archive
 * const entries = await extractFromBuffer(tar);
 * for (const { entry, data } of entries) {
 *   console.log(entry.name, data.length);
 * }
 * ```
 */

// Types
export type {
  TarFileType,
  TarHeader,
  TarEntry,
  TarEncodeOptions,
} from "./types.ts";

export type { TarInput } from "./createTar.ts";

// Functions
export { encodeHeader } from "./encodeHeader.ts";
export { decodeHeader } from "./decodeHeader.ts";
export { extract, extractFromBuffer } from "./extract.ts";
export { createTar, createTarStream } from "./createTar.ts";

// Encoding utilities
export { encodeString, decodeString } from "./encoding.ts";
