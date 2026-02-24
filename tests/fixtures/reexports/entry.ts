import { log } from "funee";
import { helper } from "./barrel.ts";

export default function() {
  helper();
  log("reexports work");
}
