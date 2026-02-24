use std::rc::Rc;
use swc_common::{Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::{EsVersion, Program};
use swc_ecma_parser::{parse_file_as_module, Syntax, TsSyntax};
use swc_ecma_transforms_typescript::strip;

pub fn load_module(cm: &Rc<SourceMap>, path: std::path::PathBuf) -> swc_ecma_ast::Module {
    let m = parse_file_as_module(
        &*cm.load_file(&path).unwrap(),
        Syntax::Typescript(TsSyntax {
            ..Default::default()
        }),
        EsVersion::latest(),
        None,
        &mut vec![],
    )
    .expect("failed to parse input as a module");

    let globals = Globals::default();
    GLOBALS.set(&globals, || {
        let unresolved_mark = Mark::new();
        let top_level_mark = Mark::new();
        let mut pass = strip(unresolved_mark, top_level_mark);
        let program = Program::Module(m);
        match program.apply(&mut pass) {
            Program::Module(m) => m,
            _ => panic!("expected module"),
        }
    })
}
