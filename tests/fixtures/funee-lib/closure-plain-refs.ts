import { Closure, log } from "funee";

export default function() {
  // Test Closure constructor with plain object references
  const c = Closure({
    expression: "test",
    references: {
      foo: { uri: "foo.ts", name: "foo" },
      bar: { uri: "bar.ts", name: "bar" }
    }
  });
  
  log(`references is Map: ${c.references instanceof Map}`);
  log(`reference count: ${c.references.size}`);
}
