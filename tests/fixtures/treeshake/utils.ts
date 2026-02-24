import { log } from "funee";

export function used() {
  log("used function");
}

export function unused() {
  log("unused function - should NOT appear in output");
}

export function alsoUnused() {
  log("also unused - should NOT appear in output");
}
