import { log } from "funee";
import { renameMe } from "./another.ts";

export default function () {
  renameMe();
  log("hello world 2");
}
