/**
 * Test fixture: HTTP request with custom headers
 * 
 * Makes a request with custom headers to httpbin.org.
 */
import { log, httpRequest } from "funee";

export default async () => {
  const response = await httpRequest({
    method: "GET",
    target: { url: "https://httpbin.org/headers" },
    headers: {
      "X-Custom-Header": "test-value",
      "Accept": "application/json"
    }
  });
  
  log(`status: ${response.status}`);
  
  const data = JSON.parse(response.body) as { headers: Record<string, string> };
  log(`custom header received: ${data.headers["X-Custom-Header"] === "test-value" ? "yes" : "no"}`);
};
