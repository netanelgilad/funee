// Macro execution runtime for bundle-time macro expansion
// Executes macro functions with captured Closure arguments using deno_core

use deno_core::{
    error::AnyError, op2, serde_json, Extension, FastString, JsRuntime, OpState,
    PollEventLoopOptions, RuntimeOptions,
};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;

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

/// Internal state for capturing macro results
struct MacroState {
    result: Option<String>,
}

#[op2]
#[string]
fn op_set_macro_result(state: &mut OpState, #[string] result: String) -> Result<(), AnyError> {
    let macro_state = state.borrow_mut::<MacroState>();
    macro_state.result = Some(result);
    Ok(())
}

deno_core::extension!(
    funee_macro_ext,
    ops = [op_set_macro_result],
    state = |state| {
        state.put(MacroState { result: None });
    }
);

pub struct MacroRuntime {
    runtime: JsRuntime,
}

impl MacroRuntime {
    pub fn new() -> Self {
        let runtime = JsRuntime::new(RuntimeOptions {
            extensions: vec![funee_macro_ext::init_ops()],
            ..Default::default()
        });

        Self { runtime }
    }

    /// Execute a macro function with arguments at bundle time
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
                    arg.expression.replace('`', "\\`").replace('$', "\\$"),
                    refs_entries
                )
            })
            .collect::<Vec<_>>()
            .join(", ");

        // Execute the macro and send result back via op
        let code = format!(
            r#"
            const __macro_fn = {macro_fn_code};
            const __macro_args = [{args_code}];
            const __macro_result = __macro_fn(...__macro_args);
            // Serialize and send result back to Rust
            const __result_json = JSON.stringify({{
                expression: __macro_result.expression,
                references: Object.fromEntries(__macro_result.references || new Map())
            }});
            Deno.core.ops.op_set_macro_result(__result_json);
            "#
        );

        let js_code: FastString = code.into();
        self.runtime.execute_script("[funee:macro_exec]", js_code)?;

        // Get the result from state
        let result_str = {
            let state = self.runtime.op_state();
            let mut state = state.borrow_mut();
            let macro_state = state.borrow_mut::<MacroState>();
            macro_state
                .result
                .take()
                .ok_or_else(|| deno_core::error::type_error("Macro did not produce a result"))?
        };

        // Parse the JSON result
        let parsed: serde_json::Value = serde_json::from_str(&result_str)?;

        let expression = parsed["expression"]
            .as_str()
            .ok_or_else(|| deno_core::error::type_error("Macro result missing expression"))?
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
        refs.insert(
            "foo".to_string(),
            ("./utils.ts".to_string(), "foo".to_string()),
        );

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
