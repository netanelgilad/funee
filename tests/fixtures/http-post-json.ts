/**
 * Test fixture: HTTP POST JSON request
 * 
 * Makes a POST request with JSON body to httpbin.org and logs the response.
 */
import { log, httpPostJSON } from "funee";

export default async () => {
  const result = await httpPostJSON<{ json: { foo: string }; url: string }>({
    target: { url: "https://httpbin.org/post" },
    data: { foo: "bar" }
  });
  
  log(`url: ${result.url}`);
  log(`data echoed: ${result.json.foo}`);
};
