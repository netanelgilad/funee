/**
 * FsResult - Type definitions for filesystem operation results
 * 
 * The Rust host functions return JSON-encoded results with this structure.
 */

/**
 * Success result from a filesystem operation
 */
export interface FsResultOk<T> {
  type: "ok";
  value: T;
}

/**
 * Error result from a filesystem operation
 */
export interface FsResultErr {
  type: "error";
  error: string;
}

/**
 * Result from a filesystem operation - either success or error
 */
export type FsResult<T> = FsResultOk<T> | FsResultErr;

/**
 * Parse a JSON result from a host function
 */
export const parseResult = <T>(json: string): FsResult<T> => {
  return JSON.parse(json) as FsResult<T>;
};

/**
 * Unwrap a result, throwing an error if it failed
 */
export const unwrap = <T>(result: FsResult<T>): T => {
  if (result.type === "error") {
    throw new Error(result.error);
  }
  return result.value;
};

/**
 * Stats returned by lstat
 */
export interface FileStats {
  size: number;
  is_file: boolean;
  is_directory: boolean;
  is_symlink: boolean;
  modified_ms: number | null;
  created_ms: number | null;
  accessed_ms: number | null;
}
