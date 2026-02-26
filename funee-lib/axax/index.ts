/**
 * axax - Async Iterator Utilities
 * 
 * A collection of utilities for working with async iterables.
 * These are plain TypeScript async iterators, no external dependencies.
 * 
 * @example
 * ```typescript
 * import { fromArray, map, toArray } from "funee/axax";
 * 
 * const result = await toArray(
 *   map((x: number) => x * 2)(fromArray([1, 2, 3]))
 * );
 * // result: [2, 4, 6]
 * ```
 */

// Core utilities
export { createDeferred } from "./deferred.ts";
export type { Deferred } from "./deferred.ts";

export { createSubject } from "./subject.ts";
export type { Subject } from "./subject.ts";

export { createStopError, isStopError, toCallbacks } from "./toCallbacks.ts";
export type { StopError } from "./toCallbacks.ts";

// Array conversions
export { fromArray } from "./fromArray.ts";
export { toArray } from "./toArray.ts";

// Transformations
export { map } from "./map.ts";
export { filter } from "./filter.ts";
export { reduce } from "./reduce.ts";
export { count } from "./count.ts";

// Combining iterators
export { merge } from "./merge.ts";

// Concurrent operations
export { concurrentMap } from "./concurrentMap.ts";
export { concurrentFilter } from "./concurrentFilter.ts";

// Source adapters
export { fromEmitter } from "./fromEmitter.ts";
export { fromNodeStream } from "./fromNodeStream.ts";

// Length utilities
export { collectLength } from "./collectLength.ts";
export type { CollectLengthResult } from "./collectLength.ts";
export { streamUntilLength } from "./streamUntilLength.ts";
export type { StreamUntilLengthResult } from "./streamUntilLength.ts";
