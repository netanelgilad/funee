// HTTP module that tries to import a local file
// This should fail - HTTP modules cannot import local files
import { log } from "funee";
// This import should fail:
// import { localHelper } from "/absolute/local/path.ts";

export default function() {
  log("HTTP module trying to import local");
}
