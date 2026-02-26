/**
 * Test fixture: Concurrent request handling
 * 
 * Expected behavior:
 * - Server handles multiple concurrent requests
 * - Requests don't block each other
 * - All requests complete successfully
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  let activeRequests = 0;
  let maxConcurrent = 0;
  
  // Server that tracks concurrent requests
  const server = serve({ port: 0 }, async (req) => {
    activeRequests++;
    maxConcurrent = Math.max(maxConcurrent, activeRequests);
    
    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const requestNum = activeRequests;
    activeRequests--;
    
    return new Response(`Request processed, concurrent=${requestNum}`);
  });
  
  const port = server.port;
  
  // Send 5 requests concurrently
  const numRequests = 5;
  const requests = Array(numRequests).fill(null).map(() => 
    fetch(`http://localhost:${port}/`)
  );
  
  // Wait for all requests to complete
  const responses = await Promise.all(requests);
  
  // All requests should succeed
  const allOk = responses.every(r => r.ok);
  log(`all responses ok: ${allOk}`);
  
  // Read all response bodies
  const bodies = await Promise.all(responses.map(r => r.text()));
  log(`all responses have body: ${bodies.every(b => b.length > 0)}`);
  
  // Verify concurrent handling
  log(`max concurrent requests: ${maxConcurrent}`);
  log(`handled concurrently: ${maxConcurrent > 1}`);
  
  // All requests completed
  log(`active requests after completion: ${activeRequests}`);
  log(`all requests completed: ${activeRequests === 0}`);
  
  await server.shutdown();
  log("concurrent-requests test complete");
};
