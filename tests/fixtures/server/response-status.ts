/**
 * Test fixture: Response status codes
 * 
 * Expected behavior:
 * - Handler can return different status codes
 * - response.ok reflects 2xx status
 * - response.status matches returned status
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that returns different status codes based on path
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/ok") {
      return new Response("OK", { status: 200 });
    }
    if (url.pathname === "/created") {
      return new Response("Created", { status: 201 });
    }
    if (url.pathname === "/no-content") {
      return new Response(null, { status: 204 });
    }
    if (url.pathname === "/bad-request") {
      return new Response("Bad Request", { status: 400 });
    }
    if (url.pathname === "/not-found") {
      return new Response("Not Found", { status: 404 });
    }
    if (url.pathname === "/error") {
      return new Response("Internal Server Error", { status: 500 });
    }
    
    return new Response("Default", { status: 200 });
  });
  
  const port = server.port;
  
  // Test 200 OK
  const ok = await fetch(`http://localhost:${port}/ok`);
  log(`200 status: ${ok.status}`);
  log(`200 ok: ${ok.ok}`);
  log(`200 is correct: ${ok.status === 200 && ok.ok === true}`);
  
  // Test 201 Created
  const created = await fetch(`http://localhost:${port}/created`);
  log(`201 status: ${created.status}`);
  log(`201 ok: ${created.ok}`);
  log(`201 is correct: ${created.status === 201 && created.ok === true}`);
  
  // Test 204 No Content
  const noContent = await fetch(`http://localhost:${port}/no-content`);
  log(`204 status: ${noContent.status}`);
  log(`204 ok: ${noContent.ok}`);
  log(`204 is correct: ${noContent.status === 204 && noContent.ok === true}`);
  
  // Test 400 Bad Request
  const badRequest = await fetch(`http://localhost:${port}/bad-request`);
  log(`400 status: ${badRequest.status}`);
  log(`400 ok: ${badRequest.ok}`);
  log(`400 is correct: ${badRequest.status === 400 && badRequest.ok === false}`);
  
  // Test 404 Not Found
  const notFound = await fetch(`http://localhost:${port}/not-found`);
  log(`404 status: ${notFound.status}`);
  log(`404 ok: ${notFound.ok}`);
  log(`404 is correct: ${notFound.status === 404 && notFound.ok === false}`);
  
  // Test 500 Internal Server Error
  const error = await fetch(`http://localhost:${port}/error`);
  log(`500 status: ${error.status}`);
  log(`500 ok: ${error.ok}`);
  log(`500 is correct: ${error.status === 500 && error.ok === false}`);
  
  await server.shutdown();
  log("response-status test complete");
};
