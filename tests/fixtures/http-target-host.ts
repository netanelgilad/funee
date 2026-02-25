/**
 * Test fixture: HTTP target with host/path
 * 
 * Tests the HostAndPathTarget variant.
 */
import { log, httpGetJSON } from "funee";

export default async () => {
  const result = await httpGetJSON<{ url: string }>({
    target: { 
      host: "httpbin.org",
      path: "/get",
      search: "foo=bar"
    }
  });
  
  log(`url: ${result.url}`);
  log(`has query: ${result.url.includes("foo=bar") ? "yes" : "no"}`);
};
