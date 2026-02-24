import { Closure, log } from "funee";

export default function() {
  // Test runtime Closure constructor
  const c = Closure({
    expression: "test-ast-node",
    references: {}
  });
  
  log(`expression: ${c.expression}`);
  log(`references size: ${c.references.size}`);
}
