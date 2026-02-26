/**
 * Test fixture: Response.json() parses JSON body
 * 
 * Expected behavior:
 * - response.json() returns a Promise that resolves to parsed JSON
 * - JSON should be properly parsed into JavaScript objects
 * 
 * This test uses httpbin.org/json which returns a known JSON structure.
 */
import { log } from "funee";

export default async () => {
  const response = await fetch("https://httpbin.org/json");
  
  // json() should return a Promise
  const jsonPromise = response.json();
  log(`json() returns promise: ${jsonPromise instanceof Promise}`);
  
  // Await the JSON data
  const data = await jsonPromise;
  
  // Should be parsed into an object
  log(`data type: ${typeof data}`);
  log(`data is object: ${data !== null && typeof data === 'object'}`);
  
  // httpbin.org/json returns a "slideshow" object
  log(`has slideshow: ${'slideshow' in data}`);
  
  // Verify nested object access works
  if (data.slideshow) {
    log(`slideshow.title type: ${typeof data.slideshow.title}`);
    log(`slideshow has slides: ${Array.isArray(data.slideshow.slides)}`);
  }
  
  log("response-json test complete");
};
