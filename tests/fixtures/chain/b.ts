import { log } from "funee";
import { levelThree } from "./c.ts";

export function levelTwo() {
  log("level two");
  levelThree();
}
