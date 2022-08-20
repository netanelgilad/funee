use std::rc::Rc;
use swc_common::{Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::EsVersion;
use swc_ecma_parser::{parse_file_as_module, Syntax::Typescript, TsConfig};
use swc_ecma_transforms_typescript::strip;
use swc_ecma_visit::FoldWith;

pub fn load_module(cm: &Rc<SourceMap>, path: std::path::PathBuf) -> swc_ecma_ast::Module {
    let m = parse_file_as_module(
        &*cm.load_file(&path).unwrap(),
        Typescript(TsConfig {
            ..Default::default()
        }),
        EsVersion::latest(),
        None,
        &mut vec![],
    )
    .expect("failed to parse input as a module");

    let globals = Globals::default();
    let module = GLOBALS.set(&globals, || m.fold_with(&mut strip(Mark::new())));
    module
}
