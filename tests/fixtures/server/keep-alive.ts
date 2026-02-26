/**
 * Test fixture: Keep-alive connections
 * 
 * Expected behavior:
 * - Multiple requests can be made on same connection
 * - Connection: keep-alive header is respected
 * - Server tracks request count correctly
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  let requestCount = 0;
  
  // Server that tracks request count
  const server = serve({ port: 0 }, (req) => {
    requestCount++;
    return Response.json({ 
      requestNumber: requestCount,
      keepAlive: req.headers.get("connection") !== "close"
    });
  });
  
  const port = server.port;
  const baseUrl = `http://localhost:${port}`;
  
  // Make multiple sequential requests
  const results: number[] = [];
  
  for (let i = 0; i < 5; i++) {
    const response = await fetch(baseUrl, {
      headers: { "Connection": "keep-alive" }
    });
    const data = await response.json();
    results.push(data.requestNumber);
  }
  
  log(`request count: ${requestCount}`);
  log(`all requests handled: ${requestCount === 5}`);
  
  log(`results: ${JSON.stringify(results)}`);
  log(`sequential results: ${results.join(",") === "1,2,3,4,5"}`);
  
  // Test connection header is received
  const response = await fetch(baseUrl, {
    headers: { "Connection": "keep-alive" }
  });
  const data = await response.json();
  log(`keep-alive respected: ${data.keepAlive === true}`);
  
  await server.shutdown();
  log("keep-alive test complete");
};
