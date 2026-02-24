import { log } from "funee";

export default async function() {
  log("testing globals");
  
  // Test Promise.resolve
  const value = await Promise.resolve(42);
  log(`Promise.resolve: ${value}`);
  
  // Test Promise.all
  const results = await Promise.all([
    Promise.resolve("a"),
    Promise.resolve("b"),
    Promise.resolve("c"),
  ]);
  log(`Promise.all: ${results.join(",")}`);
  
  // Test Array methods (globals)
  const arr = [1, 2, 3];
  const mapped = arr.map(x => x * 2);
  log(`Array.map: ${mapped.join(",")}`);
  
  // Test Object methods
  const obj = { a: 1, b: 2 };
  const keys = Object.keys(obj);
  log(`Object.keys: ${keys.join(",")}`);
  
  // Test JSON
  const json = JSON.stringify({ test: true });
  log(`JSON.stringify: ${json}`);
  
  // Test Math
  const max = Math.max(1, 5, 3);
  log(`Math.max: ${max}`);
  
  log("globals test complete");
}
