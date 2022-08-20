use deno_core::{error::AnyError, Extension, OpDecl};

pub async fn run_js(js: &str, ops: Vec<OpDecl>) -> Result<(), AnyError> {
    let mut js_runtime = deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        extensions: vec![Extension::builder().ops(ops).build()],
        ..Default::default()
    });

    js_runtime.execute_script("[funee:runtime.js]", js)?;
    js_runtime.run_event_loop(false).await?;

    Ok(())
}
