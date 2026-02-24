import { log } from "funee";
import { add, multiply } from "./math.ts";

export default function() {
  log(`2 + 3 = ${add(2, 3)}`);
  log(`4 * 5 = ${multiply(4, 5)}`);
}
