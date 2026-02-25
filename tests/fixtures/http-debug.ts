/**
 * Debug test - simpler HTTP test
 */
import { log, httpFetch } from "funee";

export default async () => {
  const responseJson = await httpFetch(
    "GET",
    "https://httpbin.org/get",
    "{}",
    ""
  );
  log(`got response: ${responseJson.length > 0 ? "yes" : "no"}`);
};
