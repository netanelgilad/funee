/**
 * httpFetch - Low-level host function for HTTP requests
 *
 * This is the raw host function provided by the funee runtime.
 * For most use cases, prefer the higher-level httpRequest, httpGetJSON,
 * or httpPostJSON functions.
 *
 * The httpFetch function is exported from "funee" (via host.ts).
 * This module re-exports the type and provides helper functions.
 */

// Re-export httpFetch from the main funee module (it's a host function)
export { httpFetch } from "../host.ts";

/**
 * Parsed HTTP response from httpFetch.
 */
export interface HttpResponse {
  /** HTTP status code */
  status: number;
  /** Response headers */
  headers: Record<string, string>;
  /** Response body as string */
  body: string;
}

/**
 * Parse the JSON response from httpFetch.
 *
 * @param jsonResponse - The JSON string from httpFetch
 * @returns Parsed HttpResponse object
 */
export const parseHttpResponse = (json: string): HttpResponse => {
  return JSON.parse(json) as HttpResponse;
};
