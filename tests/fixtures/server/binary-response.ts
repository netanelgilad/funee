/**
 * Test fixture: Binary response data
 * 
 * Expected behavior:
 * - Server can return binary-like data as hex string
 * - Content-Type is set correctly
 * - Data integrity is maintained
 * 
 * Based on HTTP_SERVER_DESIGN.md specification.
 */
import { log, serve } from "funee";

export default async () => {
  // Create test binary data (PNG header + some data)
  const pngHeader = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  const testBinary: number[] = [];
  for (let i = 0; i < 256; i++) {
    testBinary.push(i);
  }
  
  // Convert to hex inline
  const pngHex = pngHeader.map(b => b.toString(16).padStart(2, '0')).join('');
  const binaryHex = testBinary.map(b => b.toString(16).padStart(2, '0')).join('');
  
  // Server that returns binary data as hex
  const server = serve({ port: 0 }, (req) => {
    const url = new URL(req.url);
    
    if (url.pathname === "/image") {
      return new Response(pngHex, {
        headers: { "Content-Type": "application/hex" }
      });
    }
    
    if (url.pathname === "/binary") {
      return new Response(binaryHex, {
        headers: { "Content-Type": "application/hex" }
      });
    }
    
    return new Response("Not found", { status: 404 });
  });
  
  const port = server.port;
  
  // Test image response
  const imageResponse = await fetch(`http://localhost:${port}/image`);
  log(`image response ok: ${imageResponse.ok}`);
  
  const imageContentType = imageResponse.headers.get("content-type");
  log(`image content-type: ${imageContentType}`);
  log(`image type correct: ${imageContentType === "application/hex"}`);
  
  const imageHexStr = await imageResponse.text();
  // Parse hex inline
  const imageData: number[] = [];
  for (let i = 0; i < imageHexStr.length; i += 2) {
    imageData.push(parseInt(imageHexStr.substring(i, i + 2), 16));
  }
  log(`image length: ${imageData.length}`);
  log(`image length correct: ${imageData.length === 8}`);
  
  // Check PNG signature
  const isPNG = imageData[0] === 0x89 && 
                imageData[1] === 0x50 && 
                imageData[2] === 0x4E && 
                imageData[3] === 0x47;
  log(`png signature correct: ${isPNG}`);
  
  // Test binary data response
  const binaryResponse = await fetch(`http://localhost:${port}/binary`);
  log(`binary response ok: ${binaryResponse.ok}`);
  
  const binaryContentType = binaryResponse.headers.get("content-type");
  log(`binary content-type: ${binaryContentType}`);
  log(`binary type correct: ${binaryContentType === "application/hex"}`);
  
  const binaryHexStr = await binaryResponse.text();
  // Parse hex inline
  const binaryData: number[] = [];
  for (let i = 0; i < binaryHexStr.length; i += 2) {
    binaryData.push(parseInt(binaryHexStr.substring(i, i + 2), 16));
  }
  log(`binary length: ${binaryData.length}`);
  log(`binary length correct: ${binaryData.length === 256}`);
  
  // Verify binary data integrity
  let integrityOk = true;
  for (let i = 0; i < 256; i++) {
    if (binaryData[i] !== i) {
      integrityOk = false;
      break;
    }
  }
  log(`binary integrity: ${integrityOk}`);
  
  await server.shutdown();
  log("binary-response test complete");
};
