import { log } from "funee";
import { originalName as aliased, anotherOne as renamed } from "./utils.ts";

export default function() {
  log("testing import aliases");
  aliased();
  renamed();
  log("import alias test complete");
}
