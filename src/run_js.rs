use deno_core::error::AnyError;

use crate::host::{build_runtime, Host};

pub async fn run_js(js: &str, host: &'static mut dyn Host) -> Result<(), AnyError> {
    let mut js_runtime = build_runtime(host);

    js_runtime.execute_script("[runtime.js]", js)?;
    js_runtime.run_event_loop(false).await?;

    Ok(())
}
