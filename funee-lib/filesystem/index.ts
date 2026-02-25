/**
 * Filesystem utilities for funee
 * 
 * This module provides type-safe file system operations with branded path types.
 * All operations are synchronous and use the funee runtime's host functions.
 * 
 * @example
 * ```typescript
 * import {
 *   readFile,
 *   writeFile,
 *   isFile,
 *   lstat,
 *   readdir,
 *   join,
 *   FilePathString,
 *   FolderPathString
 * } from "funee";
 * 
 * // Read a file
 * const content = readFile("/path/to/file.txt" as FilePathString);
 * 
 * // Write a file
 * writeFile("/path/to/output.txt" as FilePathString, "Hello!");
 * 
 * // Check if something is a file
 * if (isFile("/some/path")) {
 *   // ...
 * }
 * 
 * // Get file stats
 * const stats = lstat("/path/to/file.txt");
 * log(`Size: ${stats.size}`);
 * 
 * // List directory
 * const files = readdir("/path/to/dir" as FolderPathString);
 * ```
 */

// Path types
export type {
  RelativePathString,
  AbsolutePathString,
  PathString,
  FolderPathString,
  FilePathString,
} from "./PathString.ts";

export { join } from "./PathString.ts";

// Result types
export type {
  FsResult,
  FsResultOk,
  FsResultErr,
  FileStats,
} from "./FsResult.ts";

export { parseResult, unwrap } from "./FsResult.ts";

// File operations
export { readFile, readFileRaw } from "./readFile.ts";
export { readFileBinary, readFileBinaryRaw, base64Encode, base64Decode } from "./readFileBinary.ts";
export { writeFile, writeFileRaw } from "./writeFile.ts";
export { writeFileBinary, writeFileBinaryRaw } from "./writeFileBinary.ts";
export { isFile } from "./isFile.ts";
export { lstat, lstatRaw } from "./lstat.ts";
export { readdir, readdirRaw } from "./readdir.ts";
