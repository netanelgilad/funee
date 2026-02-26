/**
 * Test fixture: Request URL parsing
 * 
 * Expected behavior:
 * - Handler receives full URL in req.url
 * - URL includes pathname and search params
 * - URL can be parsed with URL constructor
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that echoes URL parts
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    return Response.json({
      pathname: url.pathname,
      search: url.search,
      searchParams: Object.fromEntries(url.searchParams),
    });
  });
  
  const port = server.port;
  
  // Test with path and query params
  const response = await fetch(`http://localhost:${port}/api/test?foo=bar&num=123`);
  const data = await response.json();
  
  log(`pathname: ${data.pathname}`);
  log(`pathname is correct: ${data.pathname === "/api/test"}`);
  
  log(`search: ${data.search}`);
  log(`search is correct: ${data.search === "?foo=bar&num=123"}`);
  
  log(`foo param: ${data.searchParams.foo}`);
  log(`foo is correct: ${data.searchParams.foo === "bar"}`);
  
  log(`num param: ${data.searchParams.num}`);
  log(`num is correct: ${data.searchParams.num === "123"}`);
  
  await server.shutdown();
  log("request-url test complete");
};
