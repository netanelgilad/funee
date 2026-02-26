/**
 * Test fixture: Redirect responses
 * 
 * Expected behavior:
 * - Server can return 301/302 redirects
 * - Location header is set correctly
 * - Client can follow or not follow redirects
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server with redirect endpoints
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/redirect-301") {
      return new Response(null, {
        status: 301,
        headers: { "Location": "/destination" }
      });
    }
    
    if (url.pathname === "/redirect-302") {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/destination" }
      });
    }
    
    if (url.pathname === "/redirect-307") {
      return new Response(null, {
        status: 307,
        headers: { "Location": "/destination" }
      });
    }
    
    if (url.pathname === "/redirect-chain") {
      return new Response(null, {
        status: 302,
        headers: { "Location": "/redirect-302" }
      });
    }
    
    if (url.pathname === "/destination") {
      return new Response("You made it!");
    }
    
    return new Response("Not found", { status: 404 });
  });
  
  const port = server.port;
  const baseUrl = `http://localhost:${port}`;
  
  // Test 301 redirect (auto-followed by fetch)
  const response301 = await fetch(`${baseUrl}/redirect-301`);
  log(`301 response ok: ${response301.ok}`);
  log(`301 final status: ${response301.status}`);
  log(`301 redirected: ${response301.redirected}`);
  const text301 = await response301.text();
  log(`301 body: ${text301}`);
  log(`301 followed: ${text301 === "You made it!"}`);
  
  // Test 302 redirect (auto-followed)
  const response302 = await fetch(`${baseUrl}/redirect-302`);
  log(`302 response ok: ${response302.ok}`);
  log(`302 redirected: ${response302.redirected}`);
  const text302 = await response302.text();
  log(`302 followed: ${text302 === "You made it!"}`);
  
  // Test redirect with redirect: "manual" (don't follow)
  const manualResponse = await fetch(`${baseUrl}/redirect-302`, {
    redirect: "manual"
  });
  log(`manual status: ${manualResponse.status}`);
  log(`manual is 302: ${manualResponse.status === 302}`);
  
  const location = manualResponse.headers.get("location");
  log(`manual location: ${location}`);
  log(`location correct: ${location === "/destination"}`);
  
  // Test redirect chain
  const chainResponse = await fetch(`${baseUrl}/redirect-chain`);
  log(`chain response ok: ${chainResponse.ok}`);
  log(`chain redirected: ${chainResponse.redirected}`);
  const chainText = await chainResponse.text();
  log(`chain followed: ${chainText === "You made it!"}`);
  
  // Test 307 Temporary Redirect
  const response307 = await fetch(`${baseUrl}/redirect-307`);
  log(`307 redirected: ${response307.redirected}`);
  const text307 = await response307.text();
  log(`307 followed: ${text307 === "You made it!"}`);
  
  await server.shutdown();
  log("redirect test complete");
};
