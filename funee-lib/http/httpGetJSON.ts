/**
 * httpGetJSON - GET request returning parsed JSON
 *
 * @example
 * ```typescript
 * import { httpGetJSON } from "funee";
 *
 * const user = await httpGetJSON({
 *   target: { url: "https://api.github.com/users/octocat" }
 * });
 *
 * console.log(user.login); // "octocat"
 * ```
 */

import { HttpTarget } from "./HttpTarget.ts";
import { httpRequest } from "./httpRequest.ts";

/**
 * Options for httpGetJSON.
 */
export interface HttpGetJSONOptions {
  /** Target URL or host+path */
  target: HttpTarget;
  /** Additional request headers */
  headers?: Record<string, string>;
}

/**
 * Make a GET request and parse the response as JSON.
 *
 * @param options - Request options
 * @returns Promise resolving to the parsed JSON response
 * @throws If the response cannot be parsed as JSON
 *
 * @example
 * ```typescript
 * // Simple GET
 * const data = await httpGetJSON({
 *   target: { url: "https://api.example.com/data" }
 * });
 *
 * // With custom headers
 * const data = await httpGetJSON({
 *   target: { url: "https://api.example.com/data" },
 *   headers: { "Authorization": "Bearer token" }
 * });
 * ```
 */
export const httpGetJSON = async <T = unknown>(
  options: HttpGetJSONOptions
): Promise<T> => {
  const { target, headers: customHeaders } = options;
  
  // Merge default headers with user-provided headers
  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "funee",
  };
  if (customHeaders) {
    for (const key of Object.keys(customHeaders)) {
      headers[key] = customHeaders[key]!;
    }
  }

  const response = await httpRequest({
    method: "GET",
    target,
    headers,
  });

  return JSON.parse(response.body) as T;
};
