import { log } from "funee";
// Import a simple inline module for testing HTTP imports
// Using a gist or similar URL
import { greet } from "https://gist.githubusercontent.com/example/test/raw/module.ts";

export default function() {
  log(`HTTP import test: ${greet("funee")}`);
}
