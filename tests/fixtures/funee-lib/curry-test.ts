import { log } from "funee";
import { curry } from "funee";

const add = (a: number, b: number): number => a + b;

export default function() {
  const addTen = curry(add, 10);
  const result = addTen(5);
  log(`curry result: ${result}`);
  log(`curry result2: ${addTen(20)}`);
  log("curry test complete");
}
