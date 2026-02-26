/**
 * Test fixture: Response properties
 * 
 * Expected behavior:
 * - response.ok: true for 2xx status codes, false otherwise
 * - response.status: numeric HTTP status code
 * - response.statusText: HTTP status message (e.g., "OK", "Not Found")
 * - response.url: final URL after any redirects
 * - response.headers: Headers object with response headers
 * - response.redirected: boolean indicating if response was redirected
 */
import { log } from "funee";

export default async () => {
  // Test with a successful response
  const response = await fetch("https://httpbin.org/get");
  
  // ok property
  log(`ok type: ${typeof response.ok}`);
  log(`ok value: ${response.ok}`);
  
  // status property
  log(`status type: ${typeof response.status}`);
  log(`status value: ${response.status}`);
  
  // statusText property
  log(`statusText type: ${typeof response.statusText}`);
  log(`statusText value: ${response.statusText}`);
  
  // url property
  log(`url type: ${typeof response.url}`);
  log(`url contains httpbin: ${response.url.includes('httpbin.org')}`);
  
  // headers property - should be a Headers object or at least have get method
  log(`headers exists: ${response.headers !== undefined}`);
  log(`headers has get method: ${typeof response.headers.get === 'function'}`);
  
  // Content-Type header should be set
  const contentType = response.headers.get('content-type');
  log(`content-type header: ${contentType !== null}`);
  log(`content-type is application/json: ${contentType?.includes('application/json')}`);
  
  // redirected property
  log(`redirected type: ${typeof response.redirected}`);
  log(`redirected value: ${response.redirected}`);
  
  log("response-properties test complete");
};
