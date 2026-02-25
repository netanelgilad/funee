/**
 * HTTP - HTTP client utilities for funee
 *
 * This module provides HTTP request functions built on the funee runtime's
 * native HTTP capabilities (using reqwest under the hood).
 *
 * @example
 * ```typescript
 * import { httpGetJSON, httpPostJSON, getBody } from "funee";
 *
 * // GET JSON data
 * const user = await httpGetJSON({
 *   target: { url: "https://api.github.com/users/octocat" }
 * });
 *
 * // POST JSON data
 * const result = await httpPostJSON({
 *   target: { url: "https://api.example.com/data" },
 *   data: { key: "value" }
 * });
 *
 * // Get raw body
 * const html = await getBody({
 *   target: { url: "https://example.com" }
 * });
 * ```
 */

// Types
export type { Hostname } from "./Hostname.ts";
export { isHostname } from "./Hostname.ts";

export type {
  URLString,
  URLTarget,
  HostAndPathTarget,
  HttpTarget,
} from "./HttpTarget.ts";
export { isURL, targetToURL } from "./HttpTarget.ts";

// Low-level fetch
// Note: httpFetch is exported from funee/host.ts, not here
export type { HttpResponse } from "./httpFetch.ts";
export { parseHttpResponse } from "./httpFetch.ts";

// Core request function
export type { HttpMethod, HttpRequestOptions } from "./httpRequest.ts";
export { httpRequest } from "./httpRequest.ts";

// Convenience functions
export type { HttpGetJSONOptions } from "./httpGetJSON.ts";
export { httpGetJSON } from "./httpGetJSON.ts";

export type { HttpPostJSONOptions } from "./httpPostJSON.ts";
export { httpPostJSON } from "./httpPostJSON.ts";

export type { GetBodyOptions } from "./getBody.ts";
export { getBody } from "./getBody.ts";
