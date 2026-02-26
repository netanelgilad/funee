/**
 * Test fixture: Server graceful shutdown
 * 
 * Expected behavior:
 * - server.shutdown() returns a Promise
 * - In-flight requests complete before shutdown finishes
 * - After shutdown, server no longer accepts connections
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  let requestCompleted = false;
  
  // Server with slow handler to test graceful shutdown
  const server = serve({ port: 0 }, async (req) => {
    // Simulate slow processing
    await new Promise(resolve => setTimeout(resolve, 100));
    requestCompleted = true;
    return new Response("OK");
  });
  
  const port = server.port;
  
  // Start a request (don't await yet)
  const requestPromise = fetch(`http://localhost:${port}/`);
  
  // Wait a bit for the request to be in-flight
  await new Promise(resolve => setTimeout(resolve, 10));
  
  // Now shutdown - should wait for the in-flight request
  log(`request completed before shutdown: ${requestCompleted}`);
  
  await server.shutdown();
  
  // In-flight request should have completed
  log(`request completed after shutdown: ${requestCompleted}`);
  
  // The request should have completed successfully
  const response = await requestPromise;
  log(`response ok: ${response.ok}`);
  log(`response status: ${response.status}`);
  
  const text = await response.text();
  log(`response body: ${text}`);
  log(`body is correct: ${text === "OK"}`);
  
  // After shutdown, new connections should fail
  let connectionFailed = false;
  try {
    await fetch(`http://localhost:${port}/`);
  } catch (e) {
    connectionFailed = true;
  }
  log(`connection after shutdown failed: ${connectionFailed}`);
  
  log("server-shutdown test complete");
};
