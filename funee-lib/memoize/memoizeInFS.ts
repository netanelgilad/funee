import { fsReadFile, fsWriteFile, fsExists, fsMkdir } from "funee";
import { parseResult, unwrap, FsResult } from "../filesystem/FsResult.ts";

/**
 * Memoize a function with filesystem-based caching.
 * 
 * Results are stored in `./cache/{identifier}_{args_hash}` files.
 * The cache persists across process restarts.
 * 
 * @param identifier - A unique identifier for this cache (identifies the function)
 * @param fn - The function to memoize
 * @returns A memoized version of the function that caches results to disk
 * 
 * @example
 * ```typescript
 * import { memoizeInFS } from "funee";
 * 
 * const expensiveComputation = memoizeInFS("myComputation", (x: number) => {
 *   // ... expensive work
 *   return result;
 * });
 * 
 * expensiveComputation(5); // computed and cached
 * expensiveComputation(5); // loaded from cache
 * ```
 */
export const memoizeInFS = <T extends (...args: any[]) => any>(
  identifier: string,
  fn: T
): ((...args: Parameters<T>) => Promise<ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>>) => {
  // In-memory cache to prevent concurrent calls
  const inProgress: Record<string, Promise<any>> = {};
  
  return (...args: Parameters<T>): Promise<ReturnType<T> extends Promise<infer U> ? U : ReturnType<T>> => {
    // Create a hash from identifier and arguments
    const hash = identifier + "_" + args
      .map((x) => String(x))
      .join("_")
      .replace(/\//g, "_");
    
    const cachePath = `./cache/${hash}`;
    
    if (!inProgress[hash]) {
      inProgress[hash] = (async () => {
        // Ensure cache directory exists
        if (!fsExists("./cache")) {
          const mkdirResult = parseResult(fsMkdir("./cache"));
          if (mkdirResult.type === "error") {
            throw new Error(`Failed to create cache directory: ${mkdirResult.error}`);
          }
        }
        
        // Check for cached result
        if (fsExists(cachePath)) {
          const readResult = parseResult(fsReadFile(cachePath)) as FsResult<string>;
          if (readResult.type === "ok") {
            const cachedValue = readResult.value;
            if (cachedValue === "undefined") {
              return undefined;
            }
            return JSON.parse(cachedValue);
          }
        }
        
        // Compute result
        const result = await fn(...args);
        delete inProgress[hash];
        
        // Write to cache
        const toCache = result === undefined ? "undefined" : JSON.stringify(result);
        const writeResult = parseResult(fsWriteFile(cachePath, toCache));
        if (writeResult.type === "error") {
          throw new Error(`Failed to write cache: ${writeResult.error}`);
        }
        
        return result;
      })();
    }
    
    return inProgress[hash];
  };
};
