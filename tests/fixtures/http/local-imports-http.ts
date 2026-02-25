// Local file that imports from HTTP
// URL will be replaced with test server URL at runtime
import { log } from "funee";
// Placeholder: import { helper } from "http://localhost:PORT/utils.ts";

export default function() {
  log("local file importing HTTP module");
  // log(helper());
}
