/**
 * Test fixture: onError callback
 * 
 * Expected behavior:
 * - When handler throws, onError is called
 * - onError can return a custom error response
 * - Without onError, default 500 response is returned
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server with onError callback
  const server = serve({
    port: 0,
    onError: (error) => {
      return new Response(`Error: ${error.message}`, { status: 500 });
    }
  }, () => {
    throw new Error("Something broke");
  });
  
  const port = server.port;
  
  // Request should not throw but return error response
  const response = await fetch(`http://localhost:${port}/`);
  
  log(`response status: ${response.status}`);
  log(`status is 500: ${response.status === 500}`);
  
  const text = await response.text();
  log(`error message in body: ${text}`);
  log(`body contains error: ${text.includes("Something broke")}`);
  
  await server.shutdown();
  
  // Test default error handling (no onError)
  const server2 = serve({ port: 0 }, () => {
    throw new Error("Unhandled error");
  });
  
  const response2 = await fetch(`http://localhost:${server2.port}/`);
  log(`default error status: ${response2.status}`);
  log(`default is 500: ${response2.status === 500}`);
  
  await server2.shutdown();
  
  log("on-error test complete");
};
