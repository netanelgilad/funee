use deno_core::{error::AnyError, op, Extension, OpState, Resource};

struct SomeResource {}

impl Resource for SomeResource {}

pub fn init() -> Extension {
    Extension::builder()
        .ops(vec![op_log::decl()])
        .state(move |state| {
            state.resource_table.add(SomeResource {});
            Ok(())
        })
        .build()
}

#[op]
fn op_log(state: &mut OpState, something: String) -> Result<(), AnyError> {
    let r = state.resource_table.add(SomeResource {});
    println!(
        "{:?}",
        state.resource_table.names().into_iter().collect::<Vec<_>>()
    );
    println!("{:#?}", something);
    Ok(())
}
