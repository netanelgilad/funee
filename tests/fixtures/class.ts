import { log } from "funee";
import { Counter } from "./counter.ts";

export default function() {
  const counter = new Counter();
  counter.increment();
  counter.increment();
  log(`Counter value: ${counter.getValue()}`);
}
