/**
 * Test fixture: CORS headers
 * 
 * Expected behavior:
 * - Server can set CORS headers correctly
 * - Access-Control-Allow-Origin works
 * - Preflight OPTIONS requests handled
 * - Access-Control-Allow-Methods/Headers work
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server with CORS headers
  const server = serve({ port: 0 }, (req) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Custom-Header",
      "Access-Control-Max-Age": "86400",
    };
    
    // Handle preflight OPTIONS requests
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }
    
    // Regular response with CORS headers
    return new Response("OK", {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain"
      }
    });
  });
  
  const port = server.port;
  
  // Test regular GET request with CORS headers
  const response = await fetch(`http://localhost:${port}/`);
  log(`response ok: ${response.ok}`);
  
  const allowOrigin = response.headers.get("access-control-allow-origin");
  log(`allow-origin: ${allowOrigin}`);
  log(`allow-origin correct: ${allowOrigin === "*"}`);
  
  const allowMethods = response.headers.get("access-control-allow-methods");
  log(`allow-methods: ${allowMethods}`);
  log(`allow-methods correct: ${allowMethods?.includes("GET") && allowMethods?.includes("POST")}`);
  
  const allowHeaders = response.headers.get("access-control-allow-headers");
  log(`allow-headers: ${allowHeaders}`);
  log(`allow-headers correct: ${allowHeaders?.includes("Content-Type") && allowHeaders?.includes("Authorization")}`);
  
  // Test preflight OPTIONS request
  const preflightResponse = await fetch(`http://localhost:${port}/`, {
    method: "OPTIONS"
  });
  log(`preflight status: ${preflightResponse.status}`);
  log(`preflight is 204: ${preflightResponse.status === 204}`);
  
  const preflightOrigin = preflightResponse.headers.get("access-control-allow-origin");
  log(`preflight allow-origin: ${preflightOrigin}`);
  log(`preflight origin correct: ${preflightOrigin === "*"}`);
  
  const maxAge = preflightResponse.headers.get("access-control-max-age");
  log(`max-age: ${maxAge}`);
  log(`max-age correct: ${maxAge === "86400"}`);
  
  await server.shutdown();
  log("cors-headers test complete");
};
