# Macro Processing Design for Funee

**Goal:** Translate Opah's compile-time macro system to funee's Rust-based bundler.

## Background: How Macros Work in Opah

### Macro Definition
A macro in Opah is created using `createMacro()`:
```typescript
const myMacro = createMacro((arg1Closure, arg2Closure) => {
  // Returns a Closure (expression + references)
  return Closure({
    expression: someASTNode,
    references: Map({ localName: CanonicalName(...) })
  });
});
```

### Macro Detection (`isMacroDefinition`)
A definition is a macro if:
1. It's a variable declaration
2. The initializer is a call expression
3. The callee resolves to `CanonicalName({ uri: "@opah/core", name: "createMacro" })`

### Macro Execution Flow (from `processMacros.ts`)

1. **Identify macro references** in the current definition
   - Skip self-references and `createMacro` itself
   - Collect all references that resolve to macro definitions

2. **Extract macro functions**
   - For each macro reference, get the function passed to `createMacro()`
   - Execute it in context to get the actual MacroFunction

3. **Process call sites**
   - Walk the AST looking for `CallExpression` nodes
   - If the callee is a macro reference:
     - Capture each argument as a `Closure`:
       ```typescript
       Closure({
         expression: argExpression,
         references: getOutOfScopeReferences(argExpression)
                      .filter(ref => definition.references.has(ref))
       })
       ```
     - Execute the macro function with these Closures
     - Get back a `Closure` result (or `[Closure, Map<CanonicalName, Definition>]` for artificial definitions)

4. **Handle reference conflicts**
   - If the macro result uses local names already bound in the calling scope (but to different CanonicalNames):
     - Wrap the result in an IIFE: `((...conflicts) => result.expression)(...conflictValues)`
     - Rename conflicting references to canonical names inside the IIFE

5. **Replace call site**
   - Substitute the `CallExpression` with the macro's result expression
   - Merge macro's references into the definition's references
   - Remove macro references from the final definition

### Key Data Structures

**Closure:**
```typescript
{
  expression: Expression,  // AST node
  references: Map<string, CanonicalName>  // local name → unique identifier
}
```

**CanonicalName:**
```typescript
{
  uri: string,  // module URI (e.g., "./utils.ts", "@opah/core")
  name: string  // export name
}
```

**MacroFunction:**
```typescript
(...args: Closure[]) => Closure | [Closure, Map<CanonicalName, Definition>]
```

---

## Design for Funee

### Challenge: JS Execution Required

Macros are functions that run **during bundling** and manipulate AST. Opah executes them in JS because the codebase is JS/TS. Funee is Rust, but the user's macros are still JS/TS.

**Options:**
1. **Embed a JS runtime (deno_core)** ✅ RECOMMENDED
2. **Implement macro subset in Rust** ❌ Too limiting
3. **Two-pass bundling** ❌ Complex, not true compile-time

### Recommended Approach: Embedded JS Runtime

Funee already uses `deno_core` for executing the final bundle. We can use it during bundling too:

1. **Graph construction** (Rust): Build the dependency graph as usual
2. **Macro identification** (Rust): Detect which nodes are macros
3. **Macro execution** (JS via deno_core): Execute macro functions with captured Closures
4. **AST replacement** (Rust): Replace call sites with macro results
5. **Final bundling** (Rust): Emit the transformed code

---

## Implementation Plan

### 1. New Types

Add to `src/execution_request/types.rs`:

```rust
use std::collections::HashMap;
use swc_ecma_ast::Expr;

/// A closure captures an expression and its external references
#[derive(Debug, Clone)]
pub struct Closure {
    pub expression: Expr,
    pub references: HashMap<String, CanonicalName>,
}

/// Unique identifier for a definition across the codebase
#[derive(Debug, Clone, Hash, PartialEq, Eq)]
pub struct CanonicalName {
    pub uri: String,  // Module URI
    pub name: String, // Export name
}

impl CanonicalName {
    pub fn new(uri: impl Into<String>, name: impl Into<String>) -> Self {
        Self {
            uri: uri.into(),
            name: name.into(),
        }
    }
}

/// Result from executing a macro
pub enum MacroResult {
    /// Just the transformed closure
    Simple(Closure),
    /// Closure + additional artificial definitions to add to the graph
    WithDefinitions(Closure, HashMap<CanonicalName, Declaration>),
}
```

### 2. Macro Detection

Add to `src/execution_request/declaration.rs`:

```rust
impl Declaration {
    /// Check if this is a macro definition (variable initialized with createMacro())
    pub fn is_macro(&self, references: &HashMap<String, CanonicalName>) -> bool {
        match self {
            Declaration::Macro(_) => true,
            Declaration::VarInit(init) => {
                // Check if init is a call to createMacro
                if let Expr::Call(call_expr) = init {
                    if let Callee::Expr(callee) = &call_expr.callee {
                        if let Expr::Ident(ident) = callee.as_ref() {
                            if let Some(canonical) = references.get(&ident.sym.to_string()) {
                                return canonical.uri == "@opah/core" 
                                    && canonical.name == "createMacro";
                            }
                        }
                    }
                }
                false
            }
            _ => false,
        }
    }

    /// Extract the macro function from createMacro(macroFn)
    pub fn extract_macro_function(&self) -> Option<Expr> {
        match self {
            Declaration::Macro(expr) => Some(expr.clone()),
            Declaration::VarInit(Expr::Call(call_expr)) => {
                call_expr.args.first().map(|arg| (*arg.expr).clone())
            }
            _ => None,
        }
    }
}
```

### 3. Macro Processing Module

Create `src/execution_request/process_macros.rs`:

```rust
use super::{
    declaration::Declaration,
    types::{CanonicalName, Closure, MacroResult},
    source_graph::SourceGraph,
};
use std::collections::HashMap;
use swc_ecma_ast::{CallExpr, Expr};
use swc_ecma_visit::{VisitMut, VisitMutWith};

impl SourceGraph {
    /// Process macros in the graph before emitting code
    pub fn process_macros(&mut self) -> Result<(), MacroError> {
        // 1. Identify all macro definitions
        let macro_nodes = self.find_macro_nodes();
        
        // 2. For each node that references macros, process call sites
        for node_idx in self.graph.node_indices().collect::<Vec<_>>() {
            let references = self.get_references_for_node(node_idx);
            let macro_refs = self.filter_macro_references(&references, &macro_nodes);
            
            if macro_refs.is_empty() {
                continue;
            }
            
            // 3. Extract and execute macros via JS runtime
            let macro_functions = self.load_macro_functions(&macro_refs)?;
            
            // 4. Replace macro call sites
            self.replace_macro_calls(node_idx, &macro_functions)?;
        }
        
        Ok(())
    }
    
    fn replace_macro_calls(
        &mut self,
        node_idx: NodeIndex,
        macro_functions: &HashMap<CanonicalName, String>,
    ) -> Result<(), MacroError> {
        let (_, declaration) = &mut self.graph[node_idx];
        
        // Visit all CallExpr nodes and replace macro calls
        let mut visitor = MacroCallReplacer {
            macros: macro_functions,
            references: self.get_references_for_node(node_idx),
            runtime: self.create_macro_runtime()?,
        };
        
        match declaration {
            Declaration::Expr(expr) => expr.visit_mut_with(&mut visitor),
            Declaration::VarInit(expr) => expr.visit_mut_with(&mut visitor),
            // ... other variants
            _ => {}
        }
        
        Ok(())
    }
}

struct MacroCallReplacer<'a> {
    macros: &'a HashMap<CanonicalName, String>,
    references: HashMap<String, CanonicalName>,
    runtime: MacroRuntime,
}

impl VisitMut for MacroCallReplacer<'_> {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        // Check if callee is a macro
        if let Callee::Expr(callee) = &call.callee {
            if let Expr::Ident(ident) = callee.as_ref() {
                if let Some(canonical) = self.references.get(&ident.sym.to_string()) {
                    if self.macros.contains_key(canonical) {
                        // This is a macro call! Execute it and replace
                        let result = self.execute_macro(canonical, &call.args);
                        // Replace call expression with result
                        // ... handle conflicts and merge references
                    }
                }
            }
        }
        
        // Continue visiting children
        call.visit_mut_children_with(self);
    }
}
```

### 4. JS Runtime for Macro Execution

Create `src/execution_request/macro_runtime.rs`:

```rust
use deno_core::{JsRuntime, RuntimeOptions, op2};
use swc_ecma_ast::Expr;
use crate::execution_request::types::{Closure, MacroResult};

pub struct MacroRuntime {
    runtime: JsRuntime,
}

impl MacroRuntime {
    pub fn new() -> Self {
        let mut runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![
                // Extension with Closure/CanonicalName helpers
                deno_core::Extension {
                    name: "funee_macros",
                    ops: std::borrow::Cow::Borrowed(&[
                        // ops for creating Closures, CanonicalNames
                    ]),
                    ..Default::default()
                },
            ],
            ..Default::default()
        });
        
        // Initialize runtime with helper functions
        runtime.execute_script(
            "<init>",
            include_str!("./macro_runtime_helpers.js"),
        ).unwrap();
        
        Self { runtime }
    }
    
    /// Execute a macro function with given arguments
    pub fn execute_macro(
        &mut self,
        macro_fn: &str,
        args: Vec<Closure>,
    ) -> Result<MacroResult, MacroError> {
        // Serialize closures to JS objects
        let args_json = serde_json::to_string(&args)?;
        
        // Execute: (macro_fn)(...args)
        let code = format!(
            r#"
            const macroFn = {};
            const args = JSON.parse('{}');
            const result = macroFn(...args.map(deserializeClosure));
            serializeMacroResult(result);
            "#,
            macro_fn, args_json
        );
        
        let result_json = self.runtime.execute_script("<macro>", &code)?;
        
        // Deserialize back to Rust
        let result: MacroResult = serde_json::from_str(&result_json)?;
        Ok(result)
    }
}
```

Create `src/execution_request/macro_runtime_helpers.js`:
```javascript
// Helpers to serialize/deserialize Closures between Rust and JS

function deserializeClosure(obj) {
  return {
    expression: parseExpression(obj.expression), // Use SWC parser
    references: new Map(Object.entries(obj.references)),
  };
}

function serializeMacroResult(result) {
  if (Array.isArray(result)) {
    return JSON.stringify({
      type: 'WithDefinitions',
      closure: serializeClosure(result[0]),
      definitions: serializeDefinitions(result[1]),
    });
  } else {
    return JSON.stringify({
      type: 'Simple',
      closure: serializeClosure(result),
    });
  }
}

function serializeClosure(closure) {
  return {
    expression: generateCode(closure.expression), // Serialize AST back to string
    references: Object.fromEntries(closure.references),
  };
}
```

### 5. Integration into Bundling Flow

Modify `src/execution_request.rs`:

```rust
impl ExecutionRequest {
    pub fn emit(self) -> String {
        let mut source_graph = SourceGraph::load(LoadParams {
            scope: self.scope,
            expression: self.expression,
            host_functions: self.host_functions.keys().cloned().collect(),
            file_loader: self.file_loader,
        });

        // NEW: Process macros before emitting
        source_graph
            .process_macros()
            .expect("Failed to process macros");

        source_graph.into_js_execution_code()
    }
}
```

### 6. Reference Conflict Resolution

When a macro result has reference conflicts, wrap in IIFE:

```rust
fn wrap_in_iife(closure: Closure, conflicts: HashMap<String, CanonicalName>) -> Expr {
    // Generate: ((conflict1, conflict2, ...) => closure.expression)(
    //             canonicalName1, canonicalName2, ...
    //           )
    
    let params: Vec<Pat> = conflicts.keys()
        .map(|name| Pat::Ident(ident(name).into()))
        .collect();
    
    let args: Vec<ExprOrSpread> = conflicts.values()
        .map(|canonical| ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Ident(ident(&canonical.canonical_identifier()))),
        })
        .collect();
    
    Expr::Call(CallExpr {
        callee: Callee::Expr(Box::new(Expr::Arrow(ArrowExpr {
            params,
            body: Box::new(BlockStmtOrExpr::Expr(Box::new(closure.expression))),
            // ...
        }))),
        args,
        // ...
    })
}
```

---

## Phased Implementation

### Phase 1: Detection (Week 1)
- [ ] Add `CanonicalName` and `Closure` types
- [ ] Implement `is_macro()` detection
- [ ] Identify macro nodes in the graph
- [ ] Write tests for macro detection

### Phase 2: Extraction (Week 2)
- [ ] Extract macro functions from `createMacro()` calls
- [ ] Capture argument closures at call sites
- [ ] Compute out-of-scope references for arguments

### Phase 3: JS Runtime (Week 3)
- [ ] Set up `deno_core` runtime for macro execution
- [ ] Implement serialization helpers
- [ ] Execute simple macro and verify AST round-trip

### Phase 4: AST Replacement (Week 4)
- [ ] Implement `VisitMut` for replacing macro calls
- [ ] Handle reference conflicts with IIFE wrapping
- [ ] Merge references from macro results

### Phase 5: Integration & Testing (Week 5)
- [ ] Integrate into bundling pipeline
- [ ] End-to-end tests with real macros
- [ ] Performance benchmarking
- [ ] Documentation

---

## Open Questions

1. **AST Serialization:** How to serialize SWC AST to/from JS?
   - Option A: Use SWC's `Serialize` impl + serde_json
   - Option B: Emit to code string, parse in JS, then emit back
   - **Recommendation:** Start with B (simpler), optimize to A later

2. **Error Handling:** How to report macro execution errors?
   - Include macro name, call site location, JS stack trace
   - Map back to original source via source maps

3. **Performance:** Is the overhead acceptable?
   - Measure on real codebases
   - Consider caching macro results (deterministic functions)

4. **Recursive Macros:** Can a macro result contain another macro call?
   - Opah doesn't seem to handle this explicitly
   - We may need iterative processing until no macros remain

5. **Artificial Definitions:** How to add to the graph mid-processing?
   - Option A: Re-run graph construction with new nodes
   - Option B: Add nodes during macro processing
   - **Recommendation:** B (cleaner, more efficient)

---

## Alternative Considered: Two-Pass Bundling

Instead of embedding a runtime, bundle twice:

1. **First pass:** Bundle normally, emit JS code
2. **Execute bundle:** Run it to find macros and their results
3. **Second pass:** Bundle again with macro calls replaced

**Pros:**
- No deno_core complexity during bundling
- Macros execute in final runtime (no serialization)

**Cons:**
- ❌ Not true compile-time (requires full execution)
- ❌ Side effects from first bundle
- ❌ Slow (bundle → execute → bundle)
- ❌ Hard to isolate macro execution

**Verdict:** Embedded runtime is cleaner.

---

## Conclusion

Macros are a powerful compile-time metaprogramming feature. The recommended approach:
- **Detect macros** in Rust during graph construction
- **Execute macros** in an embedded JS runtime (deno_core)
- **Replace call sites** with macro results in Rust
- **Handle conflicts** with IIFE wrapping

This keeps the architecture clean: Rust for graph/bundling, JS for user code (including macros).

Next steps: Implement Phase 1 (detection) and validate with a simple test case.
