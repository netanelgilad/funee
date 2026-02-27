/**
 * Test: Server async dispose
 * 
 * Tests that serve() returns a server with [Symbol.asyncDispose]
 * that properly shuts down the server when used with `await using`.
 */
import { log, serve, fetch } from "funee";

export default async function() {
  // Test 1: Server has asyncDispose symbol
  {
    const server = serve({ port: 0 }, () => new Response("test"));
    const hasAsyncDispose = Symbol.asyncDispose in server;
    log(`has asyncDispose: ${hasAsyncDispose ? "pass" : "fail"}`);
    await server.shutdown();
  }
  
  // Test 2: asyncDispose calls shutdown
  {
    const server = serve({ port: 0 }, () => new Response("hello"));
    const port = server.port;
    
    // Server should respond
    const res1 = await fetch(`http://127.0.0.1:${port}/`);
    const text1 = await res1.text();
    log(`before dispose responds: ${text1 === "hello" ? "pass" : "fail"}`);
    
    // Dispose the server using the symbol
    await server[Symbol.asyncDispose]();
    
    // After disposal, server should not respond
    try {
      await fetch(`http://127.0.0.1:${port}/`);
      log("after dispose fails: fail (should have thrown)");
    } catch {
      log("after dispose fails: pass");
    }
  }
  
  // Test 3: await using syntax (simulated with try/finally)
  // Note: Full `await using` syntax depends on TypeScript version
  {
    let serverPort = 0;
    let serverDisposed = false;
    
    // Simulate await using with try/finally
    const server = serve({ port: 0 }, () => new Response("using test"));
    serverPort = server.port;
    
    try {
      const res = await fetch(`http://127.0.0.1:${serverPort}/`);
      const text = await res.text();
      log(`await using responds: ${text === "using test" ? "pass" : "fail"}`);
    } finally {
      await server[Symbol.asyncDispose]();
      serverDisposed = true;
    }
    
    log(`await using disposed: ${serverDisposed ? "pass" : "fail"}`);
  }
  
  log("server-dispose test complete");
}
