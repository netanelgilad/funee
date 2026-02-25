/**
 * PathString - Branded types for file system paths
 * 
 * These types use the funee Refine system to create type-safe paths
 * that carry compile-time knowledge about their nature (relative/absolute,
 * file/folder).
 * 
 * @example
 * ```typescript
 * import { PathString, FilePathString, FolderPathString } from "funee";
 * 
 * function processFile(path: FilePathString) {
 *   // TypeScript ensures this is a file path
 * }
 * 
 * function listDir(path: FolderPathString) {
 *   // TypeScript ensures this is a folder path
 * }
 * ```
 */

import { Refine, KeySet } from "../refine/index.ts";

/**
 * A path string that is known to be relative (doesn't start with /)
 */
export type RelativePathString = Refine<string, KeySet<"RelativePath">>;

/**
 * A path string that is known to be absolute (starts with /)
 */
export type AbsolutePathString = Refine<string, KeySet<"AbsolutePath">>;

/**
 * A path string (either relative or absolute)
 */
export type PathString = RelativePathString | AbsolutePathString;

/**
 * A path string that is known to point to a folder/directory
 */
export type FolderPathString = Refine<PathString, KeySet<"Folder">>;

/**
 * A path string that is known to point to a file
 */
export type FilePathString = Refine<PathString, KeySet<"File">>;

/**
 * Join path segments together.
 * 
 * Note: This is a simple implementation that concatenates with "/".
 * For more robust path handling, consider using platform-specific logic.
 * 
 * @param a - First path segment
 * @param b - Second path segment
 * @returns The joined path
 * 
 * @example
 * ```typescript
 * const path = join("/home", "user");
 * // => "/home/user"
 * ```
 */
export const join = (a: string, b: string): string => {
  const combined = a + "/" + b;
  return combined.replace(/\/+/g, "/");
};
