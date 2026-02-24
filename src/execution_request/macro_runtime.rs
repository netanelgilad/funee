// Prototype implementation of macro execution runtime
// This demonstrates the key concepts from STEP3_MACRO_EXECUTION.md

use deno_core::{error::AnyError, Extension, FastString, JsRuntime, RuntimeOptions};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::rc::Rc;
use swc_common::SourceMap;
use swc_ecma_ast::Expr;
use swc_ecma_codegen::{text_writer::JsWriter, Emitter};

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
    Simple {
        closure: Closure,
    },
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
        // Create deno_core runtime with macro helpers
        let ext = Extension {
            name: "funee_macros",
            ..Default::default()
        };

        let mut runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        // Load macro runtime helpers
        let helpers = include_str!("./macro_helpers.js");
        runtime
            .execute_script("[funee:macro_helpers.js]", FastString::from(helpers))
            .expect("Failed to initialize macro runtime");

        Self {
            runtime,
            source_map,
        }
    }

    /// Execute a macro function with arguments
    /// 
    /// This is the core of Step 3: run a macro function during bundling
    /// using the same deno_core runtime that executes the final bundle.
    /// 
    /// # Arguments
    /// * `macro_fn_code` - The macro function as JS code (e.g., "(x) => ...")
    /// * `args` - Vector of Closures representing the macro arguments
    /// 
    /// # Returns
    /// MacroResult containing the transformed closure
    pub async fn execute_macro(
        &mut self,
        macro_fn_code: &str,
        args: Vec<Closure>,
    ) -> Result<MacroResult, AnyError> {
        // Serialize arguments to JSON
        let args_json = serde_json::to_string(&args)?;

        // Build execution code that:
        // 1. Defines the macro function
        // 2. Deserializes arguments into Closure objects
        // 3. Calls the macro with arguments
        // 4. Serializes the result back to JSON
        let code = format!(
            r#"
            (async () => {{
                const macroFn = {macro_fn_code};
                const argsData = {args_json};
                const args = argsData.map(globalThis.__funee_deserialize_closure);
                const result = macroFn(...args);
                return globalThis.__funee_serialize_macro_result(result);
            }})()
            "#
        );

        // Execute the macro
        let result_value = self
            .runtime
            .execute_script("[funee:macro_exec]", FastString::from(code))?;

        // Resolve the promise (macro execution might be async)
        let result_promise = self.runtime.resolve_value(result_value).await?;

        // Extract JSON string from V8 value
        let scope = &mut self.runtime.handle_scope();
        let local = v8::Local::new(scope, result_promise);
        let result_json = serde_v8::from_v8::<String>(scope, local)?;

        // Deserialize to MacroResult
        let result: MacroResult = serde_json::from_str(&result_json)?;
        Ok(result)
    }

    /// Convert AST Expr to JS code string
    /// 
    /// Used to serialize Rust AST into JS code that can be manipulated by macros
    pub fn expr_to_code(&self, expr: &Expr) -> String {
        let mut buf = vec![];
        {
            let mut emitter = Emitter {
                cfg: Default::default(),
                cm: self.source_map.clone(),
                comments: None,
                wr: JsWriter::new(self.source_map.clone(), "\n", &mut buf, None),
            };
            emitter
                .emit_expr(expr)
                .expect("Failed to emit expression");
        }
        String::from_utf8(buf).expect("Invalid UTF-8 in generated code")
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use swc_common::{FilePathMapping, SourceMap};

    #[tokio::test]
    async fn test_execute_simple_macro() {
        let cm = Rc::new(SourceMap::new(FilePathMapping::empty()));
        let mut runtime = MacroRuntime::new(cm);

        // Simple macro that adds 1 to the expression
        let macro_fn = r#"
            (x) => {
                return {
                    expression: `(${x.expression}) + 1`,
                    references: x.references
                };
            }
        "#;

        let arg = Closure {
            expression: "5".to_string(),
            references: HashMap::new(),
        };

        let result = runtime.execute_macro(macro_fn, vec![arg]).await.unwrap();

        match result {
            MacroResult::Simple { closure } => {
                assert_eq!(closure.expression, "(5) + 1");
            }
            _ => panic!("Expected Simple result"),
        }
    }

    #[tokio::test]
    async fn test_execute_macro_with_references() {
        let cm = Rc::new(SourceMap::new(FilePathMapping::empty()));
        let mut runtime = MacroRuntime::new(cm);

        // Macro that uses a reference
        let macro_fn = r#"
            (x) => {
                const refs = new Map(x.references);
                refs.set('helper', { uri: './utils.ts', name: 'add' });
                return {
                    expression: `helper(${x.expression}, 1)`,
                    references: refs
                };
            }
        "#;

        let arg = Closure {
            expression: "value".to_string(),
            references: HashMap::new(),
        };

        let result = runtime.execute_macro(macro_fn, vec![arg]).await.unwrap();

        match result {
            MacroResult::Simple { closure } => {
                assert_eq!(closure.expression, "helper(value, 1)");
                assert_eq!(
                    closure.references.get("helper"),
                    Some(&("./utils.ts".to_string(), "add".to_string()))
                );
            }
            _ => panic!("Expected Simple result"),
        }
    }

    #[tokio::test]
    async fn test_recursive_macro_expansion() {
        let cm = Rc::new(SourceMap::new(FilePathMapping::empty()));
        let mut runtime = MacroRuntime::new(cm);

        // First macro: addOne
        let add_one_macro = r#"
            (x) => ({
                expression: `(${x.expression}) + 1`,
                references: x.references
            })
        "#;

        // Second macro: addTwo (calls addOne twice)
        // Note: In a real scenario, this would be handled by the iterative
        // expansion loop in SourceGraph::process_macros()
        let add_two_macro = r#"
            (x) => {
                const addOne = %ADD_ONE%;
                const step1 = addOne(x);
                const step2 = addOne(step1);
                return step2;
            }
        "#
        .replace("%ADD_ONE%", add_one_macro);

        let arg = Closure {
            expression: "5".to_string(),
            references: HashMap::new(),
        };

        let result = runtime.execute_macro(&add_two_macro, vec![arg]).await.unwrap();

        match result {
            MacroResult::Simple { closure } => {
                // Should be ((5) + 1) + 1
                assert_eq!(closure.expression, "((5) + 1) + 1");
            }
            _ => panic!("Expected Simple result"),
        }
    }
}
