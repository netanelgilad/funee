/**
 * Test fixture: Setting custom request headers
 * 
 * Expected behavior:
 * - Headers can be passed as a plain object { name: value }
 * - Custom headers are sent with the request
 * - Standard headers like Authorization work correctly
 * 
 * This test uses httpbin.org/headers which echoes back the request headers.
 */
import { log } from "funee";

export default async () => {
  const response = await fetch("https://httpbin.org/headers", {
    headers: {
      "X-Custom-Header": "test-value-123",
      "Authorization": "Bearer my-test-token",
      "Accept": "application/json",
      "X-Request-Id": "req-12345"
    }
  });
  
  log(`ok: ${response.ok}`);
  log(`status: ${response.status}`);
  
  const data = await response.json();
  
  // httpbin returns headers in the 'headers' field
  log(`has headers field: ${'headers' in data}`);
  
  if (data.headers) {
    // Check each custom header was received
    // Note: Header names may be normalized (title-case or lowercase)
    const headers = data.headers;
    
    // X-Custom-Header
    const customHeader = headers['X-Custom-Header'] || headers['x-custom-header'];
    log(`X-Custom-Header received: ${customHeader === 'test-value-123'}`);
    log(`X-Custom-Header value: ${customHeader}`);
    
    // Authorization
    const authHeader = headers['Authorization'] || headers['authorization'];
    log(`Authorization received: ${authHeader === 'Bearer my-test-token'}`);
    log(`Authorization value: ${authHeader}`);
    
    // Accept
    const acceptHeader = headers['Accept'] || headers['accept'];
    log(`Accept received: ${acceptHeader?.includes('application/json')}`);
    
    // X-Request-Id
    const requestIdHeader = headers['X-Request-Id'] || headers['x-request-id'];
    log(`X-Request-Id received: ${requestIdHeader === 'req-12345'}`);
  }
  
  log("custom-headers test complete");
};
