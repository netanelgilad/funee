/**
 * httpPostJSON - POST request with JSON body returning parsed JSON
 *
 * @example
 * ```typescript
 * import { httpPostJSON } from "funee";
 *
 * const result = await httpPostJSON({
 *   target: { url: "https://api.example.com/users" },
 *   data: { name: "John", email: "john@example.com" }
 * });
 * ```
 */

import { HttpTarget } from "./HttpTarget.ts";
import { httpRequest, HttpMethod } from "./httpRequest.ts";

/**
 * Options for httpPostJSON.
 */
export interface HttpPostJSONOptions {
  /** Target URL or host+path */
  target: HttpTarget;
  /** Data to send as JSON (will be stringified) */
  data?: unknown;
  /** Additional request headers */
  headers?: Record<string, string>;
  /** HTTP method (defaults to POST, but can be PUT/PATCH) */
  method?: HttpMethod;
}

/**
 * Make a POST request with JSON body and parse the response as JSON.
 *
 * @param options - Request options
 * @returns Promise resolving to the parsed JSON response
 * @throws If the response cannot be parsed as JSON
 *
 * @example
 * ```typescript
 * // Simple POST with data
 * const result = await httpPostJSON({
 *   target: { url: "https://api.example.com/users" },
 *   data: { name: "John" }
 * });
 *
 * // PUT request
 * const result = await httpPostJSON({
 *   target: { url: "https://api.example.com/users/123" },
 *   data: { name: "John Updated" },
 *   method: "PUT"
 * });
 *
 * // With auth header
 * const result = await httpPostJSON({
 *   target: { url: "https://api.example.com/data" },
 *   data: { key: "value" },
 *   headers: { "Authorization": "Bearer token" }
 * });
 * ```
 */
export const httpPostJSON = async <T = unknown>(
  opts: HttpPostJSONOptions
): Promise<T> => {
  const { target, data, headers: customHeaders, method } = opts;
  const body = data !== undefined ? JSON.stringify(data) : "";

  // Merge default headers with user-provided headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "funee",
  };
  if (customHeaders) {
    for (const key of Object.keys(customHeaders)) {
      headers[key] = customHeaders[key]!;
    }
  }

  const response = await httpRequest({
    method: method ?? "POST",
    target,
    headers,
    body,
  });

  return JSON.parse(response.body) as T;
};
