/**
 * Watcher utilities for funee
 * 
 * NOTE: File watching is not yet implemented in funee.
 * This would require a native host op for file system events,
 * which is complex due to the async event-based nature of file watching.
 * 
 * The original implementation used Node.js fs.watchFile which polls
 * for changes. A funee implementation would need:
 * 1. A Rust host op using notify crate for file events
 * 2. An async event channel from Rust to JS
 * 3. Integration with the deno_core event loop
 * 
 * For now, consider using polling-based approaches with memoizeInFS
 * or implementing file watching outside of funee.
 */

// Placeholder type for future implementation
export type FileWatcher = {
  stop: () => void;
  onchange: (callback: () => void) => void;
};

/**
 * Watch a file for changes (NOT YET IMPLEMENTED)
 * 
 * @throws Error - File watching is not yet supported
 */
export const watchFile = (_filename: string): FileWatcher => {
  throw new Error(
    "File watching is not yet implemented in funee. " +
    "This would require a native Rust host op for file system events. " +
    "Consider using polling-based approaches or implementing file watching " +
    "outside of funee."
  );
};
