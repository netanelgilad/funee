/**
 * Test fixture: POST request with JSON body
 * 
 * Expected behavior:
 * - fetch() with method: 'POST' sends a POST request
 * - body option sends the request body
 * - Content-Type header should be set for JSON
 * 
 * Uses local test server which echoes back the request.
 */
import { log } from "funee";

export default async () => {
  const payload = { key: "value", number: 42, nested: { a: 1, b: 2 } };
  
  const response = await fetch("http://localhost:19998/post", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  
  // Should succeed
  log(`ok: ${response.ok}`);
  log(`status: ${response.status}`);
  
  // Parse the response - test server echoes the request
  const data = await response.json();
  
  // Test server puts the parsed JSON body in 'json' field
  log(`has json field: ${'json' in data}`);
  
  if (data.json) {
    // Verify our payload was received correctly
    log(`json.key: ${data.json.key}`);
    log(`json.number: ${data.json.number}`);
    log(`json.nested.a: ${data.json.nested?.a}`);
    log(`json.nested.b: ${data.json.nested?.b}`);
  }
  
  // Test server also shows the raw data in 'data' field
  log(`has data field: ${'data' in data}`);
  
  // Headers we sent should be in the response
  log(`has headers field: ${'headers' in data}`);
  if (data.headers) {
    log(`content-type sent: ${data.headers['Content-Type'] || data.headers['content-type']}`);
  }
  
  log("post-with-body test complete");
};
