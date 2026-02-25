/**
 * funee - Host Functions
 * 
 * These functions are provided by the funee runtime (Rust/Deno) and are
 * available as built-in host functions.
 */

// Core host functions
export declare function log(message: string): void;
export declare function debug(message: string): void;
export declare function randomBytes(length: number): string;

// HTTP host function
export declare function httpFetch(
  url: string,
  method: string,
  headers: string,
  body: string | null
): string;

// Filesystem host functions (return JSON strings)
export declare function fsReadFile(path: string): string;
export declare function fsWriteFile(path: string, content: string): string;
export declare function fsIsFile(path: string): boolean;
export declare function fsLstat(path: string): string;
export declare function fsReaddir(path: string): string;
