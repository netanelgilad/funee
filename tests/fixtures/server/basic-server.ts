/**
 * Test fixture: Basic HTTP server
 * 
 * Expected behavior:
 * - serve() creates and starts a server
 * - Server responds to HTTP requests
 * - Server can be shut down gracefully
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Start server on random port (port: 0)
  const server = serve({ port: 0 }, () => new Response("Hello, World!"));
  
  // Server should have port property
  log(`server has port: ${typeof server.port === 'number'}`);
  log(`server port > 0: ${server.port > 0}`);
  log(`server has hostname: ${typeof server.hostname === 'string'}`);
  log(`server has shutdown: ${typeof server.shutdown === 'function'}`);
  
  // Make a request to the server
  const response = await fetch(`http://localhost:${server.port}/`);
  
  // Verify response
  log(`response ok: ${response.ok}`);
  log(`response status: ${response.status}`);
  
  const text = await response.text();
  log(`response body: ${text}`);
  log(`body is correct: ${text === "Hello, World!"}`);
  
  // Shutdown the server
  await server.shutdown();
  log(`shutdown complete: true`);
  
  log("basic-server test complete");
};
