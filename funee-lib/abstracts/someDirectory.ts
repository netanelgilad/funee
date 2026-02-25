import { cryptoRandomString } from "../random/index.ts";
import { tmpdir } from "../os/index.ts";
import { join, FolderPathString } from "../filesystem/index.ts";

/**
 * Generate a random temporary directory path.
 * 
 * Creates a unique path in the system's temp directory.
 * Note: This only generates the path - it does not create the directory.
 * 
 * @returns A random directory path in the temp folder
 * 
 * @example
 * ```typescript
 * import { someDirectory } from "funee";
 * 
 * const dir = someDirectory();
 * // => "/tmp/funee_a1b2c3d4e5f6"
 * ```
 */
export const someDirectory = (): FolderPathString => {
  const randomSuffix = cryptoRandomString(12);
  const tempDir = tmpdir();
  return join(tempDir, `funee_${randomSuffix}`) as FolderPathString;
};
