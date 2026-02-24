import { log } from "funee";
import { publicFn } from "./utils.ts";

export default function() {
  publicFn();
  log("private helpers work");
}
