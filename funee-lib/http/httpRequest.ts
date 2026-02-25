/**
 * httpRequest - Core HTTP request function
 *
 * @example
 * ```typescript
 * import { httpRequest } from "funee";
 *
 * const response = await httpRequest({
 *   method: "GET",
 *   target: { url: "https://api.example.com/users" },
 *   headers: { "Authorization": "Bearer token" }
 * });
 *
 * console.log(response.status);
 * console.log(response.body);
 * ```
 */

import { HttpTarget, targetToURL } from "./HttpTarget.ts";
import { HttpResponse, parseHttpResponse } from "./httpFetch.ts";
// Import httpFetch from "funee" so it's recognized as a host function
import { httpFetch } from "funee";

/**
 * HTTP methods supported by httpRequest.
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD";

/**
 * Options for httpRequest.
 */
export interface HttpRequestOptions {
  /** HTTP method */
  method: HttpMethod;
  /** Target URL or host+path */
  target: HttpTarget;
  /** Request headers */
  headers?: Record<string, string>;
  /** Request body (string) */
  body?: string;
}

/**
 * Make an HTTP request.
 *
 * @param options - Request options
 * @returns Promise resolving to the HTTP response
 *
 * @example
 * ```typescript
 * // GET request
 * const response = await httpRequest({
 *   method: "GET",
 *   target: { url: "https://api.github.com/users/octocat" }
 * });
 *
 * // POST request with body
 * const response = await httpRequest({
 *   method: "POST",
 *   target: { url: "https://api.example.com/data" },
 *   headers: { "Content-Type": "application/json" },
 *   body: JSON.stringify({ key: "value" })
 * });
 * ```
 */
export const httpRequest = async (
  options: HttpRequestOptions
): Promise<HttpResponse> => {
  const { method, target, headers: customHeaders, body: requestBody } = options;
  const url = targetToURL(target);
  const headers = customHeaders ?? {};
  const body = requestBody ?? "";

  const responseJson = await httpFetch(
    method,
    url,
    JSON.stringify(headers),
    body
  );

  return parseHttpResponse(responseJson);
};
