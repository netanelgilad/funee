// Macro execution runtime for bundle-time macro expansion
// Executes macro functions with captured Closure arguments using deno_core

use deno_core::{error::AnyError, serde_json, Extension, FastString, JsRuntime, PollEventLoopOptions, RuntimeOptions};
use std::collections::HashMap;

/// A closure = expression code + its out-of-scope references
#[derive(Debug, Clone)]
pub struct MacroClosure {
    /// JS code representation of the expression
    pub expression: String,
    /// Map of local name -> (uri, export_name)
    pub references: HashMap<String, (String, String)>,
}

/// Result from macro execution
#[derive(Debug, Clone)]
pub struct MacroResult {
    pub expression: String,
    pub references: HashMap<String, (String, String)>,
}

pub struct MacroRuntime {
    runtime: JsRuntime,
}

impl MacroRuntime {
    pub fn new() -> Self {
        let ext = Extension {
            name: "funee_macros",
            ..Default::default()
        };

        let runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![ext],
            ..Default::default()
        });

        Self { runtime }
    }

    /// Execute a macro function with arguments at bundle time
    /// 
    /// # Arguments
    /// * `macro_fn_code` - The macro function as JS code (e.g., "(x) => { return { expression: ..., references: ... }; }")
    /// * `args` - Vector of MacroClosures representing the macro arguments
    /// 
    /// # Returns
    /// MacroResult containing the transformed closure
    pub fn execute_macro(
        &mut self,
        macro_fn_code: &str,
        args: Vec<MacroClosure>,
    ) -> Result<MacroResult, AnyError> {
        // Build arguments array as JS code
        let args_code = args
            .iter()
            .map(|arg| {
                let refs_entries: String = arg
                    .references
                    .iter()
                    .map(|(k, (uri, name))| {
                        format!(r#"["{}", {{ uri: "{}", name: "{}" }}]"#, k, uri, name)
                    })
                    .collect::<Vec<_>>()
                    .join(", ");
                format!(
                    r#"{{ expression: `{}`, references: new Map([{}]) }}"#,
                    arg.expression.replace('`', "\\`"),
                    refs_entries
                )
            })
            .collect::<Vec<_>>()
            .join(", ");

        // Execute the macro and capture result
        // We use a global variable to store the result since we can't easily
        // extract values from deno_core without more complex v8 handling
        let code = format!(
            r#"
            const __macro_fn = {macro_fn_code};
            const __macro_args = [{args_code}];
            const __macro_result = __macro_fn(...__macro_args);
            // Convert result to serializable format
            globalThis.__funee_macro_result = JSON.stringify({{
                expression: __macro_result.expression,
                references: Object.fromEntries(__macro_result.references || new Map())
            }});
            "#
        );

        let js_code: FastString = code.into();
        self.runtime.execute_script("[funee:macro_exec]", js_code)?;

        // Now extract the result by executing another script that returns it
        let extract_code: FastString = "globalThis.__funee_macro_result".to_string().into();
        let result_value = self.runtime.execute_script("[funee:get_result]", extract_code)?;

        // Use the main scope to get the value
        let scope = &mut self.runtime.main_context().open(&mut self.runtime);
        let local = deno_core::v8::Local::new(scope, result_value);
        
        // Get the string value
        let result_str = local.to_rust_string_lossy(scope);
        
        // Parse the JSON result
        let parsed: serde_json::Value = serde_json::from_str(&result_str)?;
        
        let expression = parsed["expression"]
            .as_str()
            .ok_or_else(|| deno_core::error::generic_error("Macro result missing expression"))?
            .to_string();
            
        let mut references = HashMap::new();
        if let Some(refs_obj) = parsed["references"].as_object() {
            for (key, val) in refs_obj {
                let uri = val["uri"].as_str().unwrap_or("").to_string();
                let name = val["name"].as_str().unwrap_or("").to_string();
                references.insert(key.clone(), (uri, name));
            }
        }

        Ok(MacroResult {
            expression,
            references,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_execute_simple_macro() {
        let mut runtime = MacroRuntime::new();

        // Simple macro that adds 1 to the expression
        let macro_fn = r#"
            (x) => {
                return {
                    expression: `(${x.expression}) + 1`,
                    references: x.references
                };
            }
        "#;

        let arg = MacroClosure {
            expression: "5".to_string(),
            references: HashMap::new(),
        };

        let result = runtime.execute_macro(macro_fn, vec![arg]).unwrap();
        assert_eq!(result.expression, "(5) + 1");
    }

    #[test]
    fn test_execute_macro_preserves_references() {
        let mut runtime = MacroRuntime::new();

        // Macro that passes through references
        let macro_fn = r#"
            (x) => {
                return {
                    expression: `wrapped(${x.expression})`,
                    references: x.references
                };
            }
        "#;

        let mut refs = HashMap::new();
        refs.insert("foo".to_string(), ("./utils.ts".to_string(), "foo".to_string()));

        let arg = MacroClosure {
            expression: "foo(1)".to_string(),
            references: refs,
        };

        let result = runtime.execute_macro(macro_fn, vec![arg]).unwrap();
        assert_eq!(result.expression, "wrapped(foo(1))");
        assert_eq!(
            result.references.get("foo"),
            Some(&("./utils.ts".to_string(), "foo".to_string()))
        );
    }

    #[test]
    fn test_execute_macro_with_multiple_args() {
        let mut runtime = MacroRuntime::new();

        // Macro that combines two expressions
        let macro_fn = r#"
            (a, b) => {
                const refs = new Map([...a.references, ...b.references]);
                return {
                    expression: `(${a.expression}) + (${b.expression})`,
                    references: refs
                };
            }
        "#;

        let arg1 = MacroClosure {
            expression: "1".to_string(),
            references: HashMap::new(),
        };
        let arg2 = MacroClosure {
            expression: "2".to_string(),
            references: HashMap::new(),
        };

        let result = runtime.execute_macro(macro_fn, vec![arg1, arg2]).unwrap();
        assert_eq!(result.expression, "(1) + (2)");
    }
}
