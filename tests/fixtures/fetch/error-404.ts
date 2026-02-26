/**
 * Test fixture: HTTP 404 error response
 * 
 * Expected behavior:
 * - fetch() does NOT throw on 404 errors
 * - response.ok is false for 4xx status codes
 * - response.status is 404
 * - The body can still be read
 * 
 * Per web standards, fetch only throws on network errors,
 * not on HTTP error status codes.
 */
import { log } from "funee";

export default async () => {
  // httpbin.org/status/404 returns a 404 response
  const response = await fetch("https://httpbin.org/status/404");
  
  // Should not throw - we get here successfully
  log("fetch did not throw on 404");
  
  // ok should be false for 4xx status
  log(`ok: ${response.ok}`);
  log(`ok is false: ${response.ok === false}`);
  
  // status should be 404
  log(`status: ${response.status}`);
  log(`status is 404: ${response.status === 404}`);
  
  // statusText should reflect the error
  log(`statusText: ${response.statusText}`);
  
  // Test other 4xx status codes
  const response400 = await fetch("https://httpbin.org/status/400");
  log(`400 ok: ${response400.ok}`);
  log(`400 status: ${response400.status}`);
  
  const response401 = await fetch("https://httpbin.org/status/401");
  log(`401 ok: ${response401.ok}`);
  log(`401 status: ${response401.status}`);
  
  const response403 = await fetch("https://httpbin.org/status/403");
  log(`403 ok: ${response403.ok}`);
  log(`403 status: ${response403.status}`);
  
  log("error-404 test complete");
};
