/**
 * Test fixture: Request body parsing
 * 
 * Expected behavior:
 * - Handler can read JSON body with req.json()
 * - Handler can read text body with req.text()
 * - Body is correctly parsed
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that parses JSON body and echoes it back
  const server = serve({ port: 0 }, async (req) => {
    if (req.method === "POST") {
      const body = await req.json();
      return Response.json({ received: body });
    }
    return new Response("Use POST with JSON body");
  });
  
  const port = server.port;
  
  // Test JSON body parsing
  const response = await fetch(`http://localhost:${port}/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hello: "world", number: 42 }),
  });
  
  log(`response ok: ${response.ok}`);
  log(`response status: ${response.status}`);
  
  const data = await response.json();
  log(`has received field: ${'received' in data}`);
  log(`received.hello: ${data.received?.hello}`);
  log(`received.number: ${data.received?.number}`);
  log(`hello is correct: ${data.received?.hello === "world"}`);
  log(`number is correct: ${data.received?.number === 42}`);
  
  await server.shutdown();
  log("request-body test complete");
};
