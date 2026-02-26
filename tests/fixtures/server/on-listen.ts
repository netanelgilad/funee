/**
 * Test fixture: onListen callback
 * 
 * Expected behavior:
 * - onListen is called when server starts listening
 * - onListen receives hostname and port info
 * - Server is ready when onListen is called
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  let listenInfo: { hostname: string; port: number } | null = null;
  let onListenCalled = false;
  
  const server = serve({
    port: 0,
    onListen: (info) => {
      onListenCalled = true;
      listenInfo = info;
    }
  }, () => new Response("OK"));
  
  // onListen should have been called synchronously or very quickly
  log(`onListen called: ${onListenCalled}`);
  
  log(`listenInfo exists: ${listenInfo !== null}`);
  log(`listenInfo.hostname: ${listenInfo?.hostname}`);
  log(`listenInfo.port: ${listenInfo?.port}`);
  log(`port matches server.port: ${listenInfo?.port === server.port}`);
  
  // Server should be ready
  const response = await fetch(`http://localhost:${server.port}/`);
  log(`server ready: ${response.ok}`);
  
  await server.shutdown();
  log("on-listen test complete");
};
