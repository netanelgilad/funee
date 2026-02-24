import { Closure, CanonicalName, log } from "funee";

export default function() {
  // Test that all types are available
  const c: Closure<any> = {
    expression: {},
    references: new Map()
  };
  
  const name: CanonicalName = {
    uri: "test.ts",
    name: "testFunc"
  };
  
  log("Closure imported");
  log("CanonicalName imported");
  log("log imported");
}
