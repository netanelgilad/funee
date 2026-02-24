import { log } from "funee";
import { aliased } from "./barrel.ts";

export default function() {
  aliased();
  log("aliased re-export works");
}
