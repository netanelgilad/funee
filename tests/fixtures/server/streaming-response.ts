/**
 * Test fixture: Streaming response (simplified)
 * 
 * Expected behavior:
 * - Server can send response with a body
 * - Multiple chunk simulation via concatenated text
 * 
 * Note: ReadableStream is not available in funee runtime,
 * so we test basic response mechanics instead.
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that returns different sized responses
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/stream") {
      // Simulate what a streamed response would look like
      const chunks = ["Hello, ", "this ", "is ", "streaming!"];
      const fullText = chunks.join("");
      return new Response(fullText, {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    if (url.pathname === "/multipart") {
      // Test a larger response
      const parts = [];
      for (let i = 0; i < 10; i++) {
        parts.push(`Part ${i} `);
      }
      return new Response(parts.join(""), {
        headers: { "Content-Type": "text/plain" }
      });
    }
    
    return new Response("Not found", { status: 404 });
  });
  
  const port = server.port;
  
  // Test simulated streaming response
  const response = await fetch(`http://localhost:${port}/stream`);
  
  log(`response ok: ${response.ok}`);
  log(`response status: ${response.status}`);
  
  const text = await response.text();
  log(`received text: ${text}`);
  log(`text is correct: ${text === "Hello, this is streaming!"}`);
  
  // Test multipart response
  const multiResponse = await fetch(`http://localhost:${port}/multipart`);
  const multiText = await multiResponse.text();
  log(`multipart ok: ${multiResponse.ok}`);
  log(`multipart has parts: ${multiText.includes("Part 0") && multiText.includes("Part 9")}`);
  
  // Verify body can be read from response object
  const response2 = await fetch(`http://localhost:${port}/stream`);
  log(`body exists: ${response2.body !== undefined}`);
  
  log(`chunks correct: ${text === "Hello, this is streaming!"}`);
  
  await server.shutdown();
  log("streaming-response test complete");
};
