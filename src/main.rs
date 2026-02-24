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

/// Host function: debug log (prefixed)
#[op2(fast)]
fn op_debug(#[string] message: &str) {
    println!("[DEBUG] {}", message);
}

fn main() -> Result<(), AnyError> {
    let args: Vec<String> = env::args().collect();
    
    if args.len() < 2 {
        eprintln!("Usage: funee [--emit] <file.ts>");
        eprintln!("");
        eprintln!("Options:");
        eprintln!("  --emit    Print bundled JavaScript instead of executing");
        eprintln!("");
        eprintln!("Runs the default export function from the given TypeScript file.");
        std::process::exit(1);
    }
    
    // Parse args
    let emit_only = args.contains(&"--emit".to_string());
    let file_path = args.iter()
        .skip(1)
        .find(|arg| !arg.starts_with("--"))
        .expect("No file path provided");
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
        (
            FuneeIdentifier {
                name: "debug".to_string(),
                uri: "funee".to_string(),
            },
            op_debug(),
        ),
    ]);
    
    // Locate funee-lib relative to the executable or use FUNEE_LIB_PATH env var
    let funee_lib_path = env::var("FUNEE_LIB_PATH").ok().or_else(|| {
        // Try to find funee-lib relative to the current executable
        env::current_exe().ok().and_then(|exe| {
            // In dev: exe is in target/release or target/debug
            // funee-lib is in the project root
            let mut path = exe.clone();
            // Go up from target/release/funee to project root
            for _ in 0..3 {
                path.pop();
            }
            path.push("funee-lib");
            path.push("index.ts");
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
            // Also check if funee-lib is next to the executable
            let mut path = exe;
            path.pop();
            path.push("funee-lib");
            path.push("index.ts");
            if path.exists() {
                return Some(path.to_string_lossy().to_string());
            }
            None
        })
    });
    
    let request = ExecutionRequest {
        expression: call_default,
        scope: absolute_path,
        host_functions,
        funee_lib_path,
        ..Default::default()
    };
    
    if emit_only {
        println!("{}", request.emit());
    } else {
        request.execute()?;
    }
    
    Ok(())
}
