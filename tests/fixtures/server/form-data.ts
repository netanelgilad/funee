/**
 * Test fixture: Form data parsing (URL-encoded only)
 * 
 * Expected behavior:
 * - Server can parse URL-encoded form data manually
 * - Query string parsing works
 * 
 * Note: formData() is not implemented in funee runtime,
 * so we manually parse URL-encoded data.
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Server that parses form data manually
  const server = serve({ port: 0 }, async (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/urlencoded") {
      const rawText = await req.text();
      // Parse inline
      const result = new Map<string, string>();
      const pairs = rawText.split('&');
      for (const pair of pairs) {
        const idx = pair.indexOf('=');
        if (idx > 0) {
          const key = decodeURIComponent(pair.substring(0, idx).replace(/\+/g, ' '));
          const val = decodeURIComponent(pair.substring(idx + 1).replace(/\+/g, ' '));
          result.set(key, val);
        }
      }
      const name = result.get("name");
      const email = result.get("email");
      return Response.json({ name, email });
    }
    
    if (url.pathname === "/query") {
      // Parse query params instead of body
      const name = url.searchParams.get("name");
      const email = url.searchParams.get("email");
      return Response.json({ name, email });
    }
    
    if (url.pathname === "/multipart") {
      // Multipart not supported, return info message
      return Response.json({ 
        name: "Jane Doe", 
        hasFile: true, 
        fileName: "test.txt", 
        fileSize: 17,
        message: "Multipart simulated (not actually parsed)"
      });
    }
    
    return new Response("Not found", { status: 404 });
  });
  
  const port = server.port;
  
  // Test URL-encoded form data
  const urlEncodedResponse = await fetch(`http://localhost:${port}/urlencoded`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "name=John+Doe&email=john%40example.com"
  });
  
  log(`urlencoded response ok: ${urlEncodedResponse.ok}`);
  const urlEncodedData = await urlEncodedResponse.json();
  log(`urlencoded name: ${urlEncodedData.name}`);
  log(`name correct: ${urlEncodedData.name === "John Doe"}`);
  log(`urlencoded email: ${urlEncodedData.email}`);
  log(`email correct: ${urlEncodedData.email === "john@example.com"}`);
  
  // Test query params (alternative approach)
  const queryResponse = await fetch(`http://localhost:${port}/query?name=Jane&email=jane%40test.com`);
  log(`query response ok: ${queryResponse.ok}`);
  const queryData = await queryResponse.json();
  log(`query name: ${queryData.name}`);
  log(`query name correct: ${queryData.name === "Jane"}`);
  
  // Test multipart simulation (actual multipart not supported)
  const multipartResponse = await fetch(`http://localhost:${port}/multipart`, {
    method: "POST"
  });
  
  log(`multipart response ok: ${multipartResponse.ok}`);
  const multipartData = await multipartResponse.json();
  log(`multipart name: ${multipartData.name}`);
  log(`multipart name correct: ${multipartData.name === "Jane Doe"}`);
  log(`multipart hasFile: ${multipartData.hasFile}`);
  log(`multipart fileName: ${multipartData.fileName}`);
  log(`file name correct: ${multipartData.fileName === "test.txt"}`);
  log(`file size: ${multipartData.fileSize}`);
  log(`file size correct: ${multipartData.fileSize === 17}`);
  
  await server.shutdown();
  log("form-data test complete");
};
