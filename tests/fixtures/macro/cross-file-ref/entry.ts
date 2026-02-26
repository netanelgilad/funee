/**
 * Test: closure macro captures cross-file references
 * 
 * The bug: When using the closure macro with a function that references
 * an import from another file, the macro should include that reference
 * in the Closure's references Map.
 * 
 * Input:
 *   import { add } from "./other.ts";
 *   const c = closure(() => () => add(1, 2));
 * 
 * Expected output:
 *   const c = {
 *     expression: () => () => add(1, 2),
 *     references: new Map([
 *       ["add", ["/absolute/path/to/other.ts", "add"]]
 *     ])
 *   };
 * 
 * The references Map should contain:
 *   - Key: the identifier name used in the captured expression ("add")
 *   - Value: a tuple of [file URI, export name] so the bundler can wire it up
 */

import { closure, log } from "funee";
import { add } from "./other.ts";

// Capture a closure that references the imported 'add' function
// The outer arrow function returns an inner function that uses 'add'
const captured = closure(() => () => add(1, 2));

export default function() {
  log(`captured type: ${typeof captured}`);
  log(`captured.expression type: ${typeof captured.expression}`);
  
  // The references Map should include 'add' from other.ts
  log(`captured.references is Map: ${captured.references instanceof Map}`);
  log(`references size: ${captured.references.size}`);
  
  // Check if 'add' is in the references
  const hasAdd = captured.references.has("add");
  log(`has 'add' reference: ${hasAdd}`);
  
  if (hasAdd) {
    const addRef = captured.references.get("add");
    log(`add reference: ${JSON.stringify(addRef)}`);
    // Reference format is { uri: string, name: string }
    log(`add ref is object: ${typeof addRef === 'object' && addRef !== null}`);
    log(`add ref.uri contains 'other.ts': ${addRef?.uri?.includes('other.ts')}`);
    log(`add ref.name is 'add': ${addRef?.name === 'add'}`);
  }
  
  // Also verify the expression is valid
  log(`expression type: ${captured.expression?.type}`);
}
