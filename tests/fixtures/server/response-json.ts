/**
 * Test fixture: Response.json() helper
 * 
 * Expected behavior:
 * - Response.json() creates JSON response
 * - Content-Type is automatically set to application/json
 * - Body is properly serialized JSON
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that returns JSON responses
  const server = serve({ port: 0 }, () => {
    return Response.json({
      message: "hello",
      number: 42,
      nested: { a: 1, b: 2 },
      array: [1, 2, 3],
    });
  });
  
  const port = server.port;
  
  const response = await fetch(`http://localhost:${port}/`);
  
  log(`response ok: ${response.ok}`);
  log(`status: ${response.status}`);
  
  // Check Content-Type header
  const contentType = response.headers.get("content-type");
  log(`content-type: ${contentType}`);
  log(`content-type includes json: ${contentType?.includes("application/json")}`);
  
  // Parse JSON
  const data = await response.json();
  log(`message: ${data.message}`);
  log(`message is correct: ${data.message === "hello"}`);
  
  log(`number: ${data.number}`);
  log(`number is correct: ${data.number === 42}`);
  
  log(`nested.a: ${data.nested?.a}`);
  log(`nested is correct: ${data.nested?.a === 1 && data.nested?.b === 2}`);
  
  log(`array length: ${data.array?.length}`);
  log(`array is correct: ${JSON.stringify(data.array) === "[1,2,3]"}`);
  
  await server.shutdown();
  log("response-json test complete");
};
