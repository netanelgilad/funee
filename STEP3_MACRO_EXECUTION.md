# Step 3: Execute Macros at Bundle Time Using deno_core

**Goal:** Execute macro functions during bundling using the same deno_core runtime that funee uses for final execution.

**Key Insight:** Macro execution is just like running any other funee function — it's recursive! We bundle the macro, run it with deno_core, get back AST, and continue bundling.

---

## ⚠️ TDD APPROACH - READ THIS FIRST

**Following PLAYBOOK.md: Write E2E tests FIRST, then implement.**

### What Success Looks Like

**Before any implementation:**
1. Write failing E2E test in `tests/cli.test.ts`
2. Create fixture file in `tests/fixtures/macros/`
3. Run tests - should fail (macro not expanded)
4. Implement the feature
5. Run tests - should pass (macro expanded correctly)

**Example Test (Write This First):**

```typescript
// tests/cli.test.ts
describe('macro execution', () => {
  it('expands simple macro at compile time', async () => {
    const { stdout, exitCode } = await runFunee([
      'tests/fixtures/macros/simple_macro.ts'
    ]);
    
    expect(exitCode).toBe(0);
    expect(stdout).toContain('6');  // addOne(5) -> (5) + 1 -> 6
  });
});
```

**Fixture (Write This Second):**

```typescript
// tests/fixtures/macros/simple_macro.ts
import { createMacro } from '@opah/core';

const addOne = createMacro((x) => ({
  expression: `(${x.expression}) + 1`,
  references: x.references
}));

const result = addOne(5);
console.log(result);
```

**Expected Behavior:**
- **Before implementation:** Outputs `addOne(5)` (macro not expanded)
- **After implementation:** Outputs `6` (macro expanded to `(5) + 1`, evaluated to `6`)

**The rest of this document describes the implementation to make the tests pass.**

---

## Overview: The Execution Model

### Current Runtime Execution (src/run_js.rs)
```rust
pub async fn run_js(js: &str, ops: Vec<OpDecl>) -> Result<(), AnyError> {
    let ext = Extension {
        ops: std::borrow::Cow::Owned(ops),
        ..Default::default()
    };
    
    let mut js_runtime = deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        extensions: vec![ext],
        ..Default::default()
    });

    let js_code: FastString = js.to_string().into();
    js_runtime.execute_script("[funee:runtime.js]", js_code)?;
    js_runtime.run_event_loop(PollEventLoopOptions::default()).await?;

    Ok(())
}
```

**This runs the FINAL bundle.** For macros, we need to run code DURING bundling.

### Macro Execution During Bundling

The same pattern applies, but:
- **Input:** A macro function (AST) + argument closures (AST)
- **Output:** A result closure (AST)
- **When:** During `SourceGraph::process_macros()`, before final code generation

```rust
// Pseudo-code flow:
macro_fn = Declaration::Macro(fn_expr)
arg = Closure { expression: arg_ast, references: {...} }

result = execute_macro(macro_fn, arg)?
// result is a Closure we can inline at the call site
```

---

## Design: Macro Execution Runtime

### 1. MacroRuntime Structure

Create `src/execution_request/macro_runtime.rs`:

```rust
use deno_core::{
    error::AnyError, Extension, FastString, JsRuntime, 
    RuntimeOptions, PollEventLoopOptions, op2, OpState
};
use serde::{Deserialize, Serialize};
use std::rc::Rc;
use std::cell::RefCell;
use swc_ecma_ast::Expr;
use swc_ecma_codegen::{text_writer::JsWriter, Emitter};
use swc_ecma_parser::{parse_file_as_expr, Syntax};
use swc_common::SourceMap;

/// A closure = expression + its out-of-scope references
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Closure {
    /// JS code representation of the expression
    pub expression: String,
    /// Map of local name -> (uri, export_name)
    pub references: HashMap<String, (String, String)>,
}

/// Result from macro execution
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum MacroResult {
    Simple { closure: Closure },
    WithDefinitions {
        closure: Closure,
        definitions: HashMap<(String, String), String>, // (uri, name) -> code
    },
}

pub struct MacroRuntime {
    runtime: JsRuntime,
    source_map: Rc<SourceMap>,
}

impl MacroRuntime {
    pub fn new(source_map: Rc<SourceMap>) -> Self {
        let ext = Extension {
            name: "funee_macros",
            ops: std::borrow::Cow::Borrowed(&[
                op_closure_create::DECL,
                op_canonical_name_create::DECL,
            ]),
            ..Default::default()
        };

        let mut runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        // Load macro runtime helpers
        runtime
            .execute_script(
                "[funee:macro_helpers.js]",
                include_str!("./macro_helpers.js").into(),
            )
            .expect("Failed to initialize macro runtime");

        Self { runtime, source_map }
    }

    /// Execute a macro function with arguments
    pub async fn execute_macro(
        &mut self,
        macro_fn_code: &str,
        args: Vec<Closure>,
    ) -> Result<MacroResult, AnyError> {
        // Serialize arguments to JSON
        let args_json = serde_json::to_string(&args)?;

        // Build execution code
        let code = format!(
            r#"
            (async () => {{
                const macroFn = {macro_fn_code};
                const argsData = {args_json};
                const args = argsData.map(__funee_deserialize_closure);
                const result = macroFn(...args);
                return __funee_serialize_macro_result(result);
            }})()
            "#
        );

        // Execute and await the result
        let result_value = self.runtime.execute_script("[funee:macro_exec]", code.into())?;
        let result_promise = self.runtime.resolve_value(result_value).await?;
        
        // Extract JSON string from the resolved value
        let scope = &mut self.runtime.handle_scope();
        let local = v8::Local::new(scope, result_promise);
        let result_json = serde_v8::from_v8::<String>(scope, local)?;

        // Deserialize to MacroResult
        let result: MacroResult = serde_json::from_str(&result_json)?;
        Ok(result)
    }

    /// Convert AST Expr to JS code string
    pub fn expr_to_code(&self, expr: &Expr) -> String {
        let mut buf = vec![];
        {
            let mut emitter = Emitter {
                cfg: Default::default(),
                cm: self.source_map.clone(),
                comments: None,
                wr: JsWriter::new(self.source_map.clone(), "\n", &mut buf, None),
            };
            emitter.emit_expr(expr).expect("Failed to emit expression");
        }
        String::from_utf8(buf).expect("Invalid UTF-8 in generated code")
    }

    /// Parse JS code string back to AST Expr
    pub fn code_to_expr(&self, code: &str) -> Result<Expr, AnyError> {
        let fm = self.source_map.new_source_file(
            swc_common::FileName::Anon,
            code.to_string(),
        );
        
        let expr = parse_file_as_expr(
            &fm,
            Syntax::Es(Default::default()),
            Default::default(),
            None,
            &mut vec![],
        )?;
        
        Ok(*expr)
    }
}

// Ops for creating Closure and CanonicalName in JS

#[op2]
#[string]
fn op_closure_create(
    #[string] expression: String,
    #[serde] references: HashMap<String, (String, String)>,
) -> String {
    serde_json::to_string(&Closure { expression, references })
        .expect("Failed to serialize Closure")
}

#[op2]
#[string]
fn op_canonical_name_create(
    #[string] uri: String,
    #[string] name: String,
) -> String {
    serde_json::to_string(&(uri, name))
        .expect("Failed to serialize CanonicalName")
}
```

### 2. JavaScript Helpers (macro_helpers.js)

Create `src/execution_request/macro_helpers.js`:

```javascript
// Helpers loaded into the macro runtime for serialization

globalThis.__funee_deserialize_closure = function(data) {
  // Closure shape: { expression: string, references: Map }
  return {
    expression: data.expression, // Keep as string for now
    references: new Map(
      Object.entries(data.references).map(([localName, [uri, name]]) => [
        localName,
        { uri, name }
      ])
    )
  };
};

globalThis.__funee_serialize_closure = function(closure) {
  return {
    expression: closure.expression,
    references: Object.fromEntries(
      Array.from(closure.references.entries()).map(([localName, canonical]) => [
        localName,
        [canonical.uri, canonical.name]
      ])
    )
  };
};

globalThis.__funee_serialize_macro_result = function(result) {
  if (Array.isArray(result)) {
    // [Closure, Map<CanonicalName, Definition>]
    const [closure, definitions] = result;
    return JSON.stringify({
      type: 'WithDefinitions',
      closure: __funee_serialize_closure(closure),
      definitions: Object.fromEntries(
        Array.from(definitions.entries()).map(([canonical, definition]) => [
          [canonical.uri, canonical.name],
          definition // definition is already a string
        ])
      )
    });
  } else {
    // Just a Closure
    return JSON.stringify({
      type: 'Simple',
      closure: __funee_serialize_closure(result)
    });
  }
};

// Helper to create Closures from JS (used by macros)
globalThis.Closure = function(props) {
  return {
    expression: props.expression,
    references: props.references || new Map()
  };
};

// Helper to create CanonicalNames
globalThis.CanonicalName = function(props) {
  return { uri: props.uri, name: props.name };
};
```

---

## Integration: Execute Macros in SourceGraph

### 3. Add Macro Processing to SourceGraph

Modify `src/execution_request/source_graph.rs`:

```rust
impl SourceGraph {
    /// Process all macros in the graph before emitting code
    pub async fn process_macros(&mut self) -> Result<(), AnyError> {
        let mut macro_runtime = MacroRuntime::new(self.source_map.clone());

        // Find all nodes that have macro calls
        let nodes_with_macros = self.find_nodes_with_macro_calls();

        for node_idx in nodes_with_macros {
            self.process_macros_in_node(node_idx, &mut macro_runtime).await?;
        }

        Ok(())
    }

    async fn process_macros_in_node(
        &mut self,
        node_idx: NodeIndex,
        runtime: &mut MacroRuntime,
    ) -> Result<(), AnyError> {
        let (uri, declaration) = &self.graph[node_idx];
        
        // Get references for this node
        let references = self.get_references_for_node(node_idx);

        // Find which references are macros
        let macro_refs: HashMap<String, FuneeIdentifier> = references
            .iter()
            .filter(|(_, funee_id)| self.macro_functions.contains(funee_id))
            .map(|(local, id)| (local.clone(), id.clone()))
            .collect();

        if macro_refs.is_empty() {
            return Ok(());
        }

        // Visit the declaration and replace macro calls
        // (Implementation below)
        
        Ok(())
    }
}
```

### 4. The Core: execute_macro Function

```rust
impl SourceGraph {
    /// Execute a single macro call
    async fn execute_macro_call(
        &self,
        macro_identifier: &FuneeIdentifier,
        call_args: &[ExprOrSpread],
        runtime: &mut MacroRuntime,
    ) -> Result<MacroResult, AnyError> {
        // Step 1: Get the macro function code
        let macro_node_idx = self.find_node_by_identifier(macro_identifier)
            .ok_or_else(|| anyhow!("Macro not found: {:?}", macro_identifier))?;
        
        let (_, macro_decl) = &self.graph[macro_node_idx];
        let macro_fn_expr = match macro_decl {
            Declaration::Macro(expr) => expr,
            _ => return Err(anyhow!("Not a macro: {:?}", macro_identifier)),
        };

        let macro_fn_code = runtime.expr_to_code(macro_fn_expr);

        // Step 2: Create Closures from call arguments
        let arg_closures = call_args
            .iter()
            .map(|arg| self.create_closure_from_expr(&arg.expr))
            .collect::<Result<Vec<_>, _>>()?;

        // Step 3: Execute the macro
        let result = runtime.execute_macro(&macro_fn_code, arg_closures).await?;

        Ok(result)
    }

    /// Create a Closure from an expression
    fn create_closure_from_expr(&self, expr: &Expr) -> Result<Closure, AnyError> {
        let runtime = MacroRuntime::new(self.source_map.clone());
        let expression = runtime.expr_to_code(expr);

        // Get out-of-scope references from the expression
        let references = self.extract_references_from_expr(expr);

        Ok(Closure {
            expression,
            references,
        })
    }

    /// Extract references from an expression
    fn extract_references_from_expr(
        &self,
        expr: &Expr,
    ) -> HashMap<String, (String, String)> {
        // Use get_references_from_declaration logic
        // Filter to only out-of-scope references
        // Map to (uri, name) tuples
        
        // Placeholder - needs actual implementation
        HashMap::new()
    }
}
```

---

## Handling Recursion: Macros Calling Macros

### The Challenge

A macro can call another macro:

```typescript
const addOne = createMacro((x) => {
  return Closure({
    expression: `${x.expression} + 1`,
    references: x.references
  });
});

const addTwo = createMacro((x) => {
  return addOne(addOne(x)); // Recursive macro call!
});

const result = addTwo(5); // Should expand to (5 + 1) + 1
```

### Solution: Iterative Expansion

```rust
impl SourceGraph {
    pub async fn process_macros(&mut self) -> Result<(), AnyError> {
        let mut macro_runtime = MacroRuntime::new(self.source_map.clone());

        // Keep processing until no macro calls remain
        let max_iterations = 100; // Prevent infinite loops
        let mut iteration = 0;

        loop {
            iteration += 1;
            if iteration > max_iterations {
                return Err(anyhow!("Macro expansion exceeded max iterations"));
            }

            let nodes_with_macros = self.find_nodes_with_macro_calls();
            
            if nodes_with_macros.is_empty() {
                break; // Done!
            }

            for node_idx in nodes_with_macros {
                self.process_macros_in_node(node_idx, &mut macro_runtime).await?;
            }
        }

        Ok(())
    }
}
```

**Key insight:** After each macro execution, the result might contain NEW macro calls. We process iteratively until no macros remain.

### Alternative: Recursive Execution Within Macro Runtime

Instead of iterative processing at the Rust level, we could handle recursion in JS:

```javascript
// In macro_helpers.js
globalThis.__funee_execute_macro_recursive = async function(macroFn, args) {
  const result = macroFn(...args);
  
  // Check if result.expression contains macro calls
  // If so, recursively expand them
  // Return fully expanded result
  
  return result;
};
```

**Trade-off:**
- **Iterative (Rust):** Simpler, better error handling, easier debugging
- **Recursive (JS):** More elegant, closer to Opah's model, potentially faster

**Recommendation:** Start with iterative (Rust) for clarity and control.

---

## Serialization Strategy: AST ↔ JS Code

### The Problem

We need to pass AST between Rust and JavaScript:
- **Rust → JS:** Macro function + argument expressions
- **JS → Rust:** Result expression

### Approach 1: Code Strings (RECOMMENDED FOR MVP)

**Rust to JS:**
```rust
let expr: Expr = /* ... */;
let code: String = emit_expr_to_string(expr);
// Send code string to JS
```

**JS to Rust:**
```rust
let code: String = /* from JS */;
let expr: Expr = parse_expr_from_string(code)?;
```

**Pros:**
- Simple, leverages existing SWC emit/parse
- Easy to debug (can read the code)
- No complex serialization format

**Cons:**
- Loses source location info
- Potentially slower (parse/emit overhead)
- Formatting might not be preserved

### Approach 2: AST JSON (FUTURE OPTIMIZATION)

SWC AST nodes implement `Serialize`/`Deserialize`. We could:

```rust
let expr: Expr = /* ... */;
let json = serde_json::to_string(&expr)?;
// Send JSON to JS
```

**Pros:**
- Preserves all AST metadata
- No parse/emit overhead
- Exact AST preservation

**Cons:**
- Large JSON payloads
- Complex deserialization in JS (need matching AST types)
- Harder to debug

**Recommendation:** Start with code strings. Optimize to JSON if performance becomes an issue.

---

## Complete Flow Example

### Input Code
```typescript
// macro.ts
import { createMacro } from '@opah/core';

export const addOne = createMacro((x) => {
  return Closure({
    expression: `${x.expression} + 1`,
    references: x.references
  });
});

// main.ts
import { addOne } from './macro.ts';

const result = addOne(5);
```

### Execution Flow

1. **Graph Construction**
   - Load `main.ts`, identify `result = addOne(5)`
   - Load `macro.ts`, detect `addOne` is a macro
   - Add to `macro_functions` set

2. **Macro Processing** (in `process_macros()`)
   ```rust
   // Find call: addOne(5)
   let call_expr = /* CallExpr node */;
   
   // Create Closure from argument
   let arg = Closure {
       expression: "5",
       references: HashMap::new(),
   };
   
   // Get macro function code
   let macro_fn = "(x) => Closure({ expression: `${x.expression} + 1`, references: x.references })";
   
   // Execute in deno_core
   let result = runtime.execute_macro(macro_fn, vec![arg]).await?;
   // result.closure.expression = "5 + 1"
   ```

3. **AST Replacement**
   ```rust
   // Replace CallExpr with result expression
   let new_expr = parse_expr("5 + 1")?;
   // Update the graph node
   ```

4. **Final Bundle**
   ```javascript
   const result = 5 + 1;
   ```

---

## Error Handling

### Macro Execution Errors

```rust
impl MacroRuntime {
    pub async fn execute_macro(
        &mut self,
        macro_fn_code: &str,
        args: Vec<Closure>,
    ) -> Result<MacroResult, MacroError> {
        match self.runtime.execute_script(...) {
            Ok(value) => { /* ... */ }
            Err(e) => {
                // Extract JS error details
                let js_error = format!("{:?}", e);
                return Err(MacroError::ExecutionFailed {
                    macro_fn: macro_fn_code.to_string(),
                    error: js_error,
                });
            }
        }
    }
}

#[derive(Debug, thiserror::Error)]
pub enum MacroError {
    #[error("Macro execution failed: {error}\nMacro: {macro_fn}")]
    ExecutionFailed {
        macro_fn: String,
        error: String,
    },
    
    #[error("Macro expansion exceeded max iterations")]
    InfiniteLoop,
    
    #[error("Failed to serialize closure: {0}")]
    SerializationError(#[from] serde_json::Error),
}
```

---

## Performance Considerations

### 1. Runtime Creation Overhead

**Problem:** Creating a new `JsRuntime` for each macro call is expensive.

**Solution:** Reuse a single runtime instance across all macro executions:
```rust
pub struct MacroRuntime {
    runtime: JsRuntime, // Single instance
}

impl MacroRuntime {
    pub async fn execute_macro(&mut self, ...) {
        // Reuse self.runtime
    }
}
```

### 2. Code String Overhead

**Measurement needed:** Benchmark parse/emit vs JSON serialization.

**Optimization path:**
1. MVP: Code strings (simple, proven)
2. If slow: Switch to AST JSON
3. If still slow: Keep AST in memory, avoid serialization

### 3. Macro Caching

Macros are pure functions (same input → same output). We could cache results:

```rust
struct MacroCache {
    cache: HashMap<(String, Vec<Closure>), MacroResult>,
}
```

**Trade-off:** Memory usage vs execution time. Implement only if profiling shows it's needed.

---

## Testing Strategy

### Unit Tests

1. **Basic macro execution**
   ```rust
   #[tokio::test]
   async fn test_execute_simple_macro() {
       let mut runtime = MacroRuntime::new(/* ... */);
       
       let macro_fn = "(x) => Closure({ expression: `${x.expression} + 1`, references: new Map() })";
       let arg = Closure {
           expression: "5".to_string(),
           references: HashMap::new(),
       };
       
       let result = runtime.execute_macro(macro_fn, vec![arg]).await.unwrap();
       
       assert_eq!(result.closure.expression, "5 + 1");
   }
   ```

2. **Recursive macros**
3. **Reference handling**
4. **Error cases**

### Integration Tests

1. **End-to-end bundling with macros**
   ```rust
   #[test]
   fn test_bundle_with_macro() {
       let input = r#"
           import { addOne } from './macro.ts';
           const result = addOne(5);
       "#;
       
       let bundle = bundle_code(input).unwrap();
       
       assert!(bundle.contains("5 + 1"));
       assert!(!bundle.contains("addOne")); // Macro removed
   }
   ```

---

## TDD Implementation Plan (Following PLAYBOOK.md)

### Phase 0: E2E Test FIRST ⚠️

**Before writing any implementation code**, create failing E2E tests in `tests/cli.test.ts`:

```typescript
// tests/cli.test.ts
import { describe, it, expect } from 'vitest';
import { runFunee } from './helpers';

describe('macro execution', () => {
  it('expands simple macro at compile time', async () => {
    const { stdout, exitCode } = await runFunee([
      'tests/fixtures/macros/simple_macro.ts'
    ]);
    
    expect(exitCode).toBe(0);
    // Macro should expand: addOne(5) -> (5) + 1 -> 6
    expect(stdout).toContain('6');
  });

  it('expands macro with references', async () => {
    const { stdout, exitCode } = await runFunee([
      'tests/fixtures/macros/macro_with_refs.ts'
    ]);
    
    expect(exitCode).toBe(0);
    // Should include the referenced function in bundle
    expect(stdout).toContain('15');  // add(10, 5)
  });

  it('handles recursive macro calls', async () => {
    const { stdout, exitCode } = await runFunee([
      'tests/fixtures/macros/recursive_macro.ts'
    ]);
    
    expect(exitCode).toBe(0);
    // addTwo(5) -> double(addOne(5)) -> ((5) + 1) * 2 -> 12
    expect(stdout).toContain('12');
  });

  it('fails with clear error for infinite macro recursion', async () => {
    const { stderr, exitCode } = await runFunee([
      'tests/fixtures/macros/infinite_macro.ts'
    ]);
    
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Macro expansion exceeded max iterations');
  });
});
```

**Create fixtures:**

```typescript
// tests/fixtures/macros/simple_macro.ts
import { createMacro } from '@opah/core';

const addOne = createMacro((x) => {
  return {
    expression: `(${x.expression}) + 1`,
    references: x.references
  };
});

const result = addOne(5);
console.log(result);
```

```typescript
// tests/fixtures/macros/macro_with_refs.ts
const add = (a: number, b: number) => a + b;

import { createMacro, CanonicalName } from '@opah/core';

const withAdd = createMacro((x) => {
  const refs = new Map(x.references);
  refs.set('add', CanonicalName({ uri: './macro_with_refs.ts', name: 'add' }));
  
  return {
    expression: `add(${x.expression}, 5)`,
    references: refs
  };
});

const result = withAdd(10);
console.log(result);
```

```typescript
// tests/fixtures/macros/recursive_macro.ts
import { createMacro } from '@opah/core';

const addOne = createMacro((x) => ({
  expression: `(${x.expression}) + 1`,
  references: x.references
}));

const double = createMacro((x) => ({
  expression: `(${x.expression}) * 2`,
  references: x.references
}));

const addTwo = createMacro((x) => {
  return double(addOne(x));
});

const result = addTwo(5);
console.log(result);
```

**Run tests - THEY SHOULD FAIL:**
```bash
cd tests && npm test
```

Expected output:
```
❌ macro execution > expands simple macro at compile time
   Expected: "6"
   Received: "addOne(5)"  # Macro not expanded yet

❌ macro execution > handles recursive macro calls
   Error: Macro 'addTwo' not recognized
```

### Phase 1: Implement MacroRuntime (1-2 days)

Now that we have failing tests, implement:

1. **Create `src/execution_request/macro_runtime.rs`**
   - Set up deno_core with macro helpers
   - Implement `execute_macro()` function

2. **Create `src/execution_request/macro_helpers.js`**
   - Serialization helpers for Closures

3. **Add unit tests to macro_runtime.rs**
   ```rust
   #[cfg(test)]
   mod tests {
       #[tokio::test]
       async fn test_execute_simple_macro() { /* ... */ }
   }
   ```

4. **Run unit tests:**
   ```bash
   cargo test macro_runtime
   ```

### Phase 2: Integrate into SourceGraph (2-3 days)

1. **Add `process_macros()` to SourceGraph**
   - Detect macro definitions during graph construction
   - Implement iterative expansion loop

2. **Implement AST visitor for macro calls**
   - Find CallExpr nodes that call macros
   - Replace with expanded results

3. **Handle Closure creation**
   - Extract references from arguments
   - Create Closure objects with proper references

4. **Run E2E tests:**
   ```bash
   cargo build --release
   cd tests && npm test
   ```

   Tests should start passing one by one:
   ```
   ✅ macro execution > expands simple macro at compile time
   ✅ macro execution > expands macro with references
   ⏳ macro execution > handles recursive macro calls  # Still working
   ```

### Phase 3: Handle Recursion (1 day)

1. **Implement iterative expansion**
   - Loop until no macro calls remain
   - Add max_iterations guard

2. **Run E2E tests:**
   ```bash
   cd tests && npm test
   ```

   All tests should pass:
   ```
   ✅ macro execution > expands simple macro at compile time
   ✅ macro execution > expands macro with references
   ✅ macro execution > handles recursive macro calls
   ✅ macro execution > fails with clear error for infinite macro recursion
   ```

### Phase 4: Commit & Document (30 min)

1. **Verify all tests pass:**
   ```bash
   cargo test          # Rust unit tests
   cd tests && npm test  # E2E tests
   ```

2. **Commit with clear message:**
   ```bash
   git add .
   git commit -m "feat: implement macro execution at bundle time

   - Add MacroRuntime using deno_core for compile-time execution
   - Implement iterative expansion for recursive macros
   - Add E2E tests for macro expansion
   - Handle reference tracking in Closures

   All tests passing."
   ```

3. **Update TASKS.md:**
   - Mark Step 3 complete
   - Note any follow-up improvements

**Total estimate:** ~1 week for complete Step 3 implementation.

---

## Open Questions for Discussion

1. **Should we support async macros?**
   - Opah macros are sync
   - Async would allow fetching data at compile time
   - Adds complexity

2. **How to handle macro errors in production?**
   - Fail the build? (strict)
   - Fall back to runtime execution? (graceful)
   - Emit warning + original code? (permissive)

3. **Should macros have access to the full graph?**
   - Could enable advanced metaprogramming
   - Security concern (arbitrary code execution)
   - For now: No, keep it simple

---

## Conclusion

Step 3 brings compile-time metaprogramming to funee using the same deno_core runtime that powers final execution. The key insights:

1. **Macros are functions** - execute them like any other funee code
2. **Recursion is natural** - iterative expansion handles macros calling macros
3. **Code strings work** - no need for complex AST serialization (yet)
4. **Reuse infrastructure** - leverage existing deno_core, SWC parser/emitter

The implementation is straightforward once we recognize that bundling and execution are just different phases of the same process. Macros blur that line beautifully.
