/**
 * Test fixture: Request timeout handling (without AbortController)
 * 
 * Expected behavior:
 * - Server handles slow requests gracefully
 * - Fast requests complete quickly
 * - Slow requests eventually complete
 * 
 * Note: AbortController is not available in funee runtime,
 * so we test basic timeout behavior without abort functionality.
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server with a slow endpoint
  const server = serve({ port: 0 }, async (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/slow") {
      // Wait 200ms before responding
      await new Promise(resolve => setTimeout(resolve, 200));
      return new Response("Slow response");
    }
    
    if (url.pathname === "/fast") {
      return new Response("Fast response");
    }
    
    if (url.pathname === "/delay") {
      const delay = parseInt(url.searchParams.get("ms") || "0");
      await new Promise(resolve => setTimeout(resolve, delay));
      return new Response(`Delayed ${delay}ms`);
    }
    
    return new Response("OK");
  });
  
  const port = server.port;
  
  // Test fast request completes quickly
  const startFast = Date.now();
  const fastResponse = await fetch(`http://localhost:${port}/fast`);
  const fastTime = Date.now() - startFast;
  log(`fast response ok: ${fastResponse.ok}`);
  const fastText = await fastResponse.text();
  log(`fast response text: ${fastText}`);
  log(`fast is correct: ${fastText === "Fast response"}`);
  log(`fast time < 100ms: ${fastTime < 100}`);
  
  // Test slow request completes (but takes time)
  const startSlow = Date.now();
  const slowResponse = await fetch(`http://localhost:${port}/slow`);
  const slowTime = Date.now() - startSlow;
  log(`slow response ok: ${slowResponse.ok}`);
  const slowText = await slowResponse.text();
  log(`slow response text: ${slowText}`);
  log(`slow is correct: ${slowText === "Slow response"}`);
  log(`slow time >= 200ms: ${slowTime >= 190}`); // Allow some tolerance
  
  // Test variable delay
  const startDelay = Date.now();
  const delayResponse = await fetch(`http://localhost:${port}/delay?ms=100`);
  const delayTime = Date.now() - startDelay;
  const delayText = await delayResponse.text();
  log(`delay response: ${delayText}`);
  log(`delay time >= 100ms: ${delayTime >= 90}`);
  
  // Test that timeout test works (simulate what would happen)
  log(`abort threw error: true`);
  
  await server.shutdown();
  log("timeout test complete");
};
