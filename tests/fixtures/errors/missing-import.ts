import { log } from "funee";
import { doesNotExist } from "./utils.ts";

export default function() {
  doesNotExist();
  log("should not reach here");
}
