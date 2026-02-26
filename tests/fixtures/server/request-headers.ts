/**
 * Test fixture: Request headers
 * 
 * Expected behavior:
 * - Handler can access request headers via req.headers
 * - headers.get() returns header value
 * - Header names are case-insensitive
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that echoes request headers
  const server = serve({ port: 0 }, (req) => {
    const customHeader = req.headers.get("x-custom");
    const authHeader = req.headers.get("authorization");
    const contentType = req.headers.get("content-type");
    
    return Response.json({
      custom: customHeader,
      authorization: authHeader,
      contentType: contentType,
    });
  });
  
  const port = server.port;
  
  const response = await fetch(`http://localhost:${port}/`, {
    headers: {
      "X-Custom": "test-value",
      "Authorization": "Bearer token123",
      "Content-Type": "application/json",
    },
    method: "POST",
    body: "{}",
  });
  
  const data = await response.json();
  
  log(`custom header: ${data.custom}`);
  log(`custom is correct: ${data.custom === "test-value"}`);
  
  log(`authorization header: ${data.authorization}`);
  log(`authorization is correct: ${data.authorization === "Bearer token123"}`);
  
  log(`content-type header: ${data.contentType}`);
  log(`content-type is correct: ${data.contentType === "application/json"}`);
  
  await server.shutdown();
  log("request-headers test complete");
};
