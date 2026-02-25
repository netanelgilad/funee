/**
 * funee - Host Functions
 * 
 * These functions are provided by the funee runtime (Rust/Deno) and are
 * available as built-in host functions. They don't have JavaScript implementations
 * because they're implemented in native code.
 * 
 * When you import from "funee", the bundler treats these as special and
 * links them to the corresponding host function implementations.
 */

/**
 * log - Print a message to the console
 * 
 * This is a host function provided by the funee runtime.
 * At bundle time, the bundler recognizes imports of `log` from "funee"
 * and links them to the native `op_log` implementation.
 * 
 * @param message - The message to log
 * 
 * @example
 * ```typescript
 * import { log } from "funee";
 * 
 * log("Hello from funee!");
 * log(`Computed value: ${result}`);
 * ```
 */
export declare function log(message: string): void;

/**
 * debug - Print a debug message (may include additional metadata)
 * 
 * Similar to log, but may include additional debugging context
 * depending on the runtime configuration.
 * 
 * @param message - The debug message
 * 
 * @example
 * ```typescript
 * import { debug } from "funee";
 * 
 * debug("Processing item: " + item.id);
 * ```
 */
export declare function debug(message: string): void;

/**
 * randomBytes - Generate cryptographically secure random bytes
 * 
 * Returns a hex-encoded string of the specified number of random bytes.
 * This is a host function that uses a secure random number generator.
 * 
 * @param length - The number of random bytes to generate
 * @returns A hex-encoded string (2 * length characters)
 * 
 * @example
 * ```typescript
 * import { randomBytes } from "funee";
 * 
 * const hex = randomBytes(16);
 * // => "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" (32 hex chars = 16 bytes)
 * ```
 */
export declare function randomBytes(length: number): string;

/**
 * Note: Host functions are NOT implemented in TypeScript
 * 
 * These are just type declarations. The actual implementations
 * are provided by the funee runtime (in Rust using deno_core ops).
 * 
 * To add a new host function:
 * 1. Add the type declaration here
 * 2. Implement the corresponding op in Rust (src/execution_request/tests.rs or similar)
 * 3. Register it in the host_functions map when creating ExecutionRequest
 */
