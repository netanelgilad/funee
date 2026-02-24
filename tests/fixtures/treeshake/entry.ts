import { log } from "funee";
import { used } from "./utils.ts";

export default function() {
  used();
  log("tree shaking works");
}
