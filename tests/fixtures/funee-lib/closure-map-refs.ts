import { Closure, log } from "funee";

export default function() {
  // Test Closure constructor with Map references
  const c = Closure({
    expression: "test",
    references: new Map([
      ["foo", { uri: "foo.ts", name: "foo" }]
    ])
  });
  
  log(`references is Map: ${c.references instanceof Map}`);
  log(`reference count: ${c.references.size}`);
}
