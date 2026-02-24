use std::rc::Rc;
use swc_common::{BytePos, LineCol, SourceMap};
use swc_ecma_ast::Module;
use swc_ecma_codegen::{
    self,
    text_writer::{JsWriter, WriteJs},
    Emitter,
};

pub fn emit_module(cm: Rc<SourceMap>, module: Module) -> (Vec<(BytePos, LineCol)>, Vec<u8>) {
    let mut buf = vec![];
    let mut srcmap = vec![];
    {
        let wr = Box::new(JsWriter::new(
            Default::default(),
            "\n",
            &mut buf,
            Some(&mut srcmap),
        )) as Box<dyn WriteJs>;

        let mut emitter = Emitter {
            cfg: swc_ecma_codegen::Config::default(),
            cm: cm,
            comments: None,
            wr,
        };

        emitter.emit_module(&module).unwrap();
    }

    (srcmap, buf)
}
