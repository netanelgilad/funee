use deno_core::{error::AnyError, op, Extension, OpState};

pub trait Host {
    fn log(&mut self, state: &mut OpState, something: String) -> Result<(), AnyError>;
}

struct HostResource<'a> {
    host: &'a mut dyn Host,
}

pub struct NoopHost {}

impl Host for NoopHost {
    fn log(&mut self, _: &mut OpState, _: String) -> Result<(), AnyError> {
        Ok(())
    }
}

pub fn build_runtime(host: &mut (dyn Host)) -> deno_core::JsRuntime {
    let resource = HostResource { host };
    deno_core::JsRuntime::new(deno_core::RuntimeOptions {
        extensions: vec![Extension::builder()
            .ops(vec![op_log::decl()])
            .js(js_files)
            .state(move |state| {
                state.resource_table.add(resource);
                Ok(())
            })
            .build()],

        ..Default::default()
    })
}

#[op]
fn op_log(state: &mut OpState, something: String) -> Result<(), AnyError> {
    let mut a = state.take::<&'static mut dyn Host>();
    a.log(state, something)
}
