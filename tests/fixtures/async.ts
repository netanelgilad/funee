import { log } from "funee";
import { asyncHelper } from "./async-helper.ts";

export default async function() {
  log("async start");
  await asyncHelper();
  log("async end");
}
