/**
 * Hostname - Branded type for validated hostnames
 *
 * @example
 * ```typescript
 * import { Hostname, isHostname } from "funee";
 *
 * function connectTo(host: Hostname) {
 *   // Type-safe: we know this is a valid hostname
 * }
 *
 * const input = "example.com";
 * if (isHostname(input)) {
 *   connectTo(input); // OK - input is now Hostname
 * }
 * ```
 */

import { KeySet, Refine } from "../refine/index.ts";

/**
 * A validated hostname string.
 * Must contain at least one dot to be considered valid.
 */
export type Hostname = Refine<string, KeySet<"Hostname">>;

/**
 * Type guard to check if a string is a valid hostname.
 * A valid hostname must contain at least one dot.
 *
 * @param x - The string to check
 * @returns True if the string is a valid hostname
 *
 * @example
 * ```typescript
 * isHostname("example.com")     // true
 * isHostname("localhost")       // false
 * isHostname("api.example.com") // true
 * ```
 */
export const isHostname = (x: string): x is Hostname => x.includes(".");
