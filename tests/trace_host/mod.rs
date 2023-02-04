use deno_core::{error::AnyError, op, Extension, OpDecl, OpState, Resource};
use funee::host::{Host, RawExtension};

struct TraceHost {
    host: Box<dyn Host>,
}

impl Host for TraceHost {
    fn get_extensions(&self) -> Vec<RawExtension> {
        vec![RawExtension {
            ops: self.host.get_extensions().into_iter().map(|raw_extension| {
                raw_extension
                    .ops
                    .into_iter()
                    .map(|op_decl| OpDecl {
                        name: op_decl.name,
                        handler: Box::new(move |state, args, _bufs| {
                            println!("{}({:?})", op_decl.name, args);
                            op_decl.handler(state, args, _bufs)
                        }),
                        ..op_decl
                    })
                    .collect()
            }).flatten().collect(),
            state: Box::new(|_state| Ok(())),
        }]
    }
}

pub fn trace_host<F>(host: F) ->  {
    Host {
        extensions: vec![RawExtension {
            ops: vec![op_log::decl()],
            state: Box::new(move |state| {
                state.put::<SomeResource>(SomeResource {
                    the_impl: Box::new(the_impl),
                });
                Ok(())
            }),
        }],
    }
}

pub fn raw_extension<F>(the_impl: F) -> RawExtension
where
    F: Fn(&mut OpState, String) -> Result<(), AnyError> + 'static + Copy,
{
}

struct SomeResource {
    pub the_impl: Box<dyn Fn(&mut OpState, String) -> Result<(), AnyError> + 'static>,
}

impl Resource for SomeResource {}

pub fn init<F>(the_impl: F) -> Extension
where
    F: Fn(&mut OpState, String) -> Result<(), AnyError> + 'static + Copy,
{
    Extension::builder()
        .ops(vec![op_log::decl()])
        .state(move |state| {
            state.put::<SomeResource>(SomeResource {
                the_impl: Box::new(the_impl),
            });
            Ok(())
        })
        .build()
}

#[op]
fn op_log(state: &mut OpState, something: String) -> Result<(), AnyError> {
    let a = state.take::<SomeResource>();
    (a.the_impl)(state, something)
}
