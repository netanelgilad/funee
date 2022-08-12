mod execute_expression_in_scope;
mod funee_identifier;
mod load_module;
mod module_loader;

use deno_core::error::AnyError;
use deno_core::op;
use deno_core::Extension;

use execute_expression_in_scope::execute_expression_in_scope;

use module_loader::FuneeModuleLoader;
use std::collections::HashMap;
use std::rc::Rc;
use swc_ecma_ast::Expr;
use swc_ecma_ast::Ident;

#[op]
async fn op_read_file(path: String) -> Result<String, AnyError> {
    let contents = tokio::fs::read_to_string(path).await?;
    Ok(contents)
}

#[op]
async fn op_write_file(path: String, contents: String) -> Result<(), AnyError> {
    tokio::fs::write(path, contents).await?;
    Ok(())
}

#[op]
fn op_remove_file(path: String) -> Result<(), AnyError> {
    std::fs::remove_file(path)?;
    Ok(())
}

async fn run_js(file_path: &str) -> Result<(), AnyError> {
    let main_module = deno_core::resolve_path(file_path)?;

    let runjs_extension = Extension::builder()
        .ops(vec![
            op_read_file::decl(),
            op_write_file::decl(),
            op_remove_file::decl(),
        ])
        .build();

    let mut js_runtime = deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        module_loader: Some(Rc::new(FuneeModuleLoader)),
        extensions: vec![runjs_extension],
        ..Default::default()
    });

    js_runtime
        .execute_script("[runjs:runtime.js]", include_str!("./runtime.js"))
        .unwrap();

    let mod_id = js_runtime.load_main_module(&main_module, None).await?;
    let result = js_runtime.mod_evaluate(mod_id);
    js_runtime.run_event_loop(false).await?;
    result.await?
}

fn main() -> Result<(), AnyError> {
    execute_expression_in_scope(
        Expr::Ident(Ident::new("stam".into(), Default::default())),
        "/Users/netanelg/Development/funee/example.ts".to_string(),
        HashMap::new(),
    );
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    if let Err(error) = runtime.block_on(run_js("./example.ts")) {
        eprintln!("error: {}", error);
    }

    Ok(())
}
