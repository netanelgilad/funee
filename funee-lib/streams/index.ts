/**
 * streams - Async Iterable Stream Utilities
 * 
 * Utilities for working with async iterables as streams.
 * These complement the axax module which provides transformations.
 * 
 * @example
 * ```typescript
 * import { fromString, toString, toBuffer, empty, fromBuffer } from "funee";
 * 
 * // Convert string to async iterable and back
 * const str = await toString(fromString("hello world"));
 * 
 * // Collect binary data
 * const buffer = await toBuffer(fromBuffer(someData));
 * 
 * // Create empty stream
 * const emptyStream = empty();
 * ```
 */

// Converters - collect async iterables into values
export { toBuffer } from "./toBuffer.ts";
export { toString } from "./toString.ts";

// Sources - create async iterables from values
export { fromString } from "./fromString.ts";
export { fromBuffer } from "./fromBuffer.ts";
export { empty } from "./empty.ts";
