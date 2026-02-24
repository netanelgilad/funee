import { Closure } from "funee";
import { log } from "funee";

export default function() {
  // Test that Closure type is available
  const c: Closure<any> = {
    expression: { type: "test" },
    references: new Map()
  };
  
  log("Closure type imported");
}
