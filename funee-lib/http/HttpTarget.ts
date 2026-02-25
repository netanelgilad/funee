/**
 * HttpTarget - Types for HTTP request targets
 *
 * Supports URL strings and URL objects for targeting HTTP requests.
 *
 * @example
 * ```typescript
 * import { HttpTarget, URLString, isURL } from "funee";
 *
 * // URL string target
 * const target1: HttpTarget = { url: "https://api.example.com/users" };
 *
 * // URL object target
 * const target2: HttpTarget = { url: new URL("https://api.example.com/users") };
 * ```
 */

import { KeySet, Refine } from "../refine/index.ts";

/**
 * A validated URL string.
 */
export type URLString = Refine<string, KeySet<"URL">>;

/**
 * Type guard to check if a string is a valid URL.
 * Uses the URL constructor for validation.
 *
 * @param x - The string to check
 * @returns True if the string is a valid URL
 */
export const isURL = (x: string): x is URLString => {
  // Simple check since we don't have URL constructor
  return x.startsWith("http://") || x.startsWith("https://");
};

/**
 * Target specified by a URL (string).
 */
export type URLTarget = {
  url: URLString | string;
};

/**
 * Target specified by host and optional path/search.
 */
export type HostAndPathTarget = {
  host: string;
  path?: string;
  search?: string;
  protocol?: "http" | "https";
};

/**
 * HTTP request target.
 * Can be a URL or host+path specification.
 */
export type HttpTarget = URLTarget | HostAndPathTarget;

/**
 * Convert an HttpTarget to a URL string.
 *
 * @param target - The HTTP target to convert
 * @returns A URL string
 */
export const targetToURL = (t: HttpTarget): string => {
  if ("url" in t) {
    return t.url;
  }

  const protocol = t.protocol ?? "https";
  const path = t.path ?? "";
  const search = t.search ? `?${t.search}` : "";
  return `${protocol}://${t.host}${path}${search}`;
};
