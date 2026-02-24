use deno_core::{error::AnyError, Extension, FastString, OpDecl, PollEventLoopOptions};

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
