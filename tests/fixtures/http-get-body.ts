/**
 * Test fixture: HTTP getBody function
 * 
 * Fetches a URL and returns the body as a string.
 */
import { log, getBody } from "funee";

export default async () => {
  const body = await getBody({
    target: { url: "https://httpbin.org/robots.txt" }
  });
  
  // httpbin.org/robots.txt returns "User-agent: *\nDisallow: /deny\n"
  log(`got body: ${body.length > 0 ? "yes" : "no"}`);
  log(`contains User-agent: ${body.includes("User-agent") ? "yes" : "no"}`);
};
