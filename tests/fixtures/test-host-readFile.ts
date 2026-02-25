// Test importing readFile directly from the main "funee" export
import { readFile, log } from "funee";

export default function() {
  const result = readFile("/tmp/funee-fs-test/test.txt");
  log("readFile result: " + result);
}
