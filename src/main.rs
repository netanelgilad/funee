mod emit_module;
pub mod execution_request;
mod funee_identifier;
mod load_module;
mod run_js;

use deno_core::{error::AnyError, op2};
use execution_request::ExecutionRequest;
use funee_identifier::FuneeIdentifier;
use std::{collections::HashMap, env, path::Path};
use swc_common::SyntaxContext;
use swc_ecma_ast::{CallExpr, Callee, Expr, Ident};

/// Host function: log to stdout
#[op2(fast)]
fn op_log(#[string] message: &str) {
    println!("{}", message);
}

fn main() -> Result<(), AnyError> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: funee <file.ts>");
        eprintln!("");
        eprintln!("Runs the default export function from the given TypeScript file.");
        std::process::exit(1);
    }
    
    let file_path = &args[1];
    let absolute_path = if Path::new(file_path).is_absolute() {
        file_path.clone()
    } else {
        env::current_dir()?
            .join(file_path)
            .to_string_lossy()
            .to_string()
    };
    
    // Create expression to call the default export: default()
    let call_default = Expr::Call(CallExpr {
        span: Default::default(),
        ctxt: SyntaxContext::empty(),
        callee: Callee::Expr(Box::new(Expr::Ident(Ident::new(
            "default".into(),
            Default::default(),
            SyntaxContext::empty(),
        )))),
        type_args: None,
        args: vec![],
    });
    
    // Set up host functions
    let host_functions = HashMap::from([
        (
            FuneeIdentifier {
                name: "log".to_string(),
                uri: "funee".to_string(),
            },
            op_log(),
        ),
    ]);
    
    let request = ExecutionRequest {
        expression: call_default,
        scope: absolute_path,
        host_functions,
        ..Default::default()
    };
    
    request.execute()?;
    
    Ok(())
}
