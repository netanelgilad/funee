/**
 * Test fixture: fetch() basic GET request
 * 
 * Expected behavior:
 * - fetch(url) returns a Promise that resolves to a Response object
 * - Response should have standard properties (ok, status, etc.)
 * 
 * This test uses httpbin.org for real HTTP testing.
 */
import { log } from "funee";

export default async () => {
  // fetch should be a global function per web standards
  const response = await fetch("https://httpbin.org/get");
  
  // Verify it returns a Response object
  log(`response type: ${typeof response}`);
  log(`response is object: ${response !== null && typeof response === 'object'}`);
  
  // Response should have the expected properties
  log(`has ok property: ${'ok' in response}`);
  log(`has status property: ${'status' in response}`);
  log(`has headers property: ${'headers' in response}`);
  log(`has json method: ${typeof response.json === 'function'}`);
  log(`has text method: ${typeof response.text === 'function'}`);
  
  // For a successful GET, ok should be true and status should be 200
  log(`ok: ${response.ok}`);
  log(`status: ${response.status}`);
  
  log("basic-get test complete");
};
