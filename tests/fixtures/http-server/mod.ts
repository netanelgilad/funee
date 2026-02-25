// Main entry module served over HTTP
import { log } from "funee";
import { helper } from "./utils.ts";

export default function() {
  log("HTTP module loaded");
  log(helper());
}
