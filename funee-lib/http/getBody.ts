/**
 * getBody - Fetch a URL and return the body as a string
 *
 * @example
 * ```typescript
 * import { getBody } from "funee";
 *
 * const html = await getBody({
 *   target: { url: "https://example.com" }
 * });
 * ```
 */

import { HttpTarget } from "./HttpTarget.ts";
import { httpRequest } from "./httpRequest.ts";

/**
 * Options for getBody.
 */
export interface GetBodyOptions {
  /** Target URL or host+path */
  target: HttpTarget;
  /** Additional request headers */
  headers?: Record<string, string>;
}

/**
 * Fetch a URL and return the response body as a string.
 *
 * @param options - Request options
 * @returns Promise resolving to the response body string
 *
 * @example
 * ```typescript
 * const content = await getBody({
 *   target: { url: "https://example.com/data.txt" }
 * });
 * ```
 */
export const getBody = async (opts: GetBodyOptions): Promise<string> => {
  const { target, headers: customHeaders } = opts;
  
  // Merge default headers with user-provided headers
  const headers: Record<string, string> = {
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

  return response.body;
};
