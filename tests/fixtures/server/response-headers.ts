/**
 * Test fixture: Response headers
 * 
 * Expected behavior:
 * - Handler can set custom response headers
 * - Headers are received by the client
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that sets custom headers
  const server = serve({ port: 0 }, () => {
    return new Response("OK", {
      headers: {
        "X-Custom-Header": "custom-value",
        "X-Another-Header": "another-value",
        "Content-Type": "text/plain; charset=utf-8",
      }
    });
  });
  
  const port = server.port;
  
  const response = await fetch(`http://localhost:${port}/`);
  
  log(`response ok: ${response.ok}`);
  
  // Check custom headers
  const customHeader = response.headers.get("x-custom-header");
  log(`X-Custom-Header: ${customHeader}`);
  log(`X-Custom-Header correct: ${customHeader === "custom-value"}`);
  
  const anotherHeader = response.headers.get("x-another-header");
  log(`X-Another-Header: ${anotherHeader}`);
  log(`X-Another-Header correct: ${anotherHeader === "another-value"}`);
  
  const contentType = response.headers.get("content-type");
  log(`Content-Type: ${contentType}`);
  log(`Content-Type includes text/plain: ${contentType?.includes("text/plain")}`);
  
  await server.shutdown();
  log("response-headers test complete");
};
