import { log } from "funee";

// Private helper - not exported but used by publicFn
function privateHelper() {
  log("private helper called");
}

// Another private helper - not used, should be tree-shaken
function unusedPrivate() {
  log("unused private - should NOT appear");
}

export function publicFn() {
  privateHelper();
  log("public function called");
}
