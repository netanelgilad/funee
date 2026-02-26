/**
 * Test fixture: Response.text() returns string body
 * 
 * Expected behavior:
 * - response.text() returns a Promise that resolves to a string
 * - The string contains the full response body
 * 
 * Uses local test server which returns HTML content.
 */
import { log } from "funee";

export default async () => {
  const response = await fetch("http://localhost:19998/html");
  
  // text() should return a Promise
  const textPromise = response.text();
  log(`text() returns promise: ${textPromise instanceof Promise}`);
  
  // Await the text
  const text = await textPromise;
  
  // Should be a string
  log(`text type: ${typeof text}`);
  
  // Should have content
  log(`text length > 0: ${text.length > 0}`);
  
  // Test server returns an HTML page
  log(`contains html tag: ${text.toLowerCase().includes('<html')}`);
  log(`contains body tag: ${text.toLowerCase().includes('<body')}`);
  
  log("response-text test complete");
};
