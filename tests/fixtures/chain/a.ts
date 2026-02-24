import { log } from "funee";
import { levelTwo } from "./b.ts";

export function levelOne() {
  log("level one");
  levelTwo();
}
