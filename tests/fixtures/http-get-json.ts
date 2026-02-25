/**
 * Test fixture: HTTP GET JSON request
 * 
 * Makes a GET request to httpbin.org and logs the response.
 */
import { log, httpGetJSON } from "funee";

export default async () => {
  const result = await httpGetJSON<{ url: string; headers: Record<string, string> }>({
    target: { url: "https://httpbin.org/get" }
  });
  
  log(`url: ${result.url}`);
  log(`headers received: yes`);
};
