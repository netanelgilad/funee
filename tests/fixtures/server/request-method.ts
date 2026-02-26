/**
 * Test fixture: HTTP request methods
 * 
 * Expected behavior:
 * - Handler receives Request object with method property
 * - Methods GET, POST, PUT, DELETE are correctly identified
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that echoes the request method
  const server = serve({ port: 0 }, (req) => {
    return new Response(req.method);
  });
  
  const port = server.port;
  
  // Test GET
  const getRes = await fetch(`http://localhost:${port}/`);
  const getMethod = await getRes.text();
  log(`GET method: ${getMethod}`);
  log(`GET is correct: ${getMethod === "GET"}`);
  
  // Test POST
  const postRes = await fetch(`http://localhost:${port}/`, { method: "POST" });
  const postMethod = await postRes.text();
  log(`POST method: ${postMethod}`);
  log(`POST is correct: ${postMethod === "POST"}`);
  
  // Test PUT
  const putRes = await fetch(`http://localhost:${port}/`, { method: "PUT" });
  const putMethod = await putRes.text();
  log(`PUT method: ${putMethod}`);
  log(`PUT is correct: ${putMethod === "PUT"}`);
  
  // Test DELETE
  const deleteRes = await fetch(`http://localhost:${port}/`, { method: "DELETE" });
  const deleteMethod = await deleteRes.text();
  log(`DELETE method: ${deleteMethod}`);
  log(`DELETE is correct: ${deleteMethod === "DELETE"}`);
  
  await server.shutdown();
  log("request-method test complete");
};
