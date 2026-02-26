/**
 * HTTP - HTTP client utilities for funee
 *
 * This module provides HTTP request functions built on the funee runtime's
 * native HTTP capabilities (using reqwest under the hood).
 *
 * ## Web Standard Fetch API
 *
 * funee provides a web-standard `fetch()` API as a global:
 *
 * ```typescript
 * // fetch is already a global - no import needed
 * const response = await fetch("https://api.example.com/data");
 * const data = await response.json();
 *
 * // POST with JSON body
 * const response = await fetch("https://api.example.com/data", {
 *   method: "POST",
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ key: "value" })
 * });
 * ```
 *
 * ## Legacy HTTP Functions
 *
 * For existing code, the legacy HTTP functions are still available:
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

// Web-standard Fetch API (types and global re-export)
export type {
  HeadersInit,
  Headers,
  HeadersConstructor,
  ResponseInit,
  ResponseType,
  Response,
  ResponseConstructor,
  RequestRedirect,
  RequestInit,
  BodyInit,
  Blob,
} from "./fetch.ts";

// Re-export fetch global for explicit imports
export { fetch } from "./fetch.ts";

// Factory function aliases (for funee-style API)
export {
  createHeaders,
  isHeaders,
  createResponse,
  createErrorResponse,
  createRedirectResponse,
  createJsonResponse,
} from "./fetch.ts";

// ============================================================================
// Web-standard Fetch API (per WHATWG Fetch Standard)
// ============================================================================

// Headers
export type { Headers, HeadersInit } from "./Headers.ts";
export { createHeaders, isHeaders } from "./Headers.ts";

// Response
export type { Response, ResponseInit } from "./Response.ts";
export {
  createResponse,
  createErrorResponse,
  createRedirectResponse,
  createJsonResponse,
} from "./Response.ts";

// Fetch function and types
export type { RequestInit, RequestRedirect } from "./fetch.ts";
export { fetch } from "./fetch.ts";
