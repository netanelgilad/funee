/**
 * Test fixture: Large request/response bodies
 * 
 * Expected behavior:
 * - Server handles large request bodies (1MB+)
 * - Server can send large response bodies
 * - Data integrity is maintained
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that handles large bodies
  const server = serve({ port: 0 }, async (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/echo") {
      // Echo back the request body
      const body = await req.text();
      return new Response(body, {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    if (url.pathname === "/large") {
      // Return a large response (1MB of 'A')
      const size = 1024 * 1024; // 1MB
      const largeData = "A".repeat(size);
      return new Response(largeData, {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    return new Response("Not found", { status: 404 });
  });
  
  const port = server.port;
  
  // Test large request body (1MB)
  const largeRequestBody = "B".repeat(1024 * 1024);
  const echoResponse = await fetch(`http://localhost:${port}/echo`, {
    method: "POST",
    body: largeRequestBody,
    headers: { "Content-Type": "text/plain" }
  });
  
  log(`echo response ok: ${echoResponse.ok}`);
  const echoText = await echoResponse.text();
  log(`echo length correct: ${echoText.length === 1024 * 1024}`);
  log(`echo content correct: ${echoText === largeRequestBody}`);
  
  // Test large response body (1MB)
  const largeResponse = await fetch(`http://localhost:${port}/large`);
  
  log(`large response ok: ${largeResponse.ok}`);
  const largeText = await largeResponse.text();
  log(`large response length: ${largeText.length}`);
  log(`large length correct: ${largeText.length === 1024 * 1024}`);
  log(`large content correct: ${largeText === "A".repeat(1024 * 1024)}`);
  
  await server.shutdown();
  log("large-body test complete");
};
