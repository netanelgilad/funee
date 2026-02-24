use std::rc::Rc;
use swc_common::source_map::DefaultSourceMapGenConfig;
use swc_common::BytePos;
use swc_common::LineCol;
use swc_common::SourceMap;
use base64::Engine;
use base64::engine::general_purpose::STANDARD;

pub fn get_inline_source_map(cm: &Rc<SourceMap>, srcmap: &mut Vec<(BytePos, LineCol)>) -> String {
    let srcmap = cm.build_source_map(srcmap, None, DefaultSourceMapGenConfig);

    let mut output: Vec<u8> = vec![];
    srcmap.to_writer(&mut output).unwrap();

    let encoded = STANDARD.encode(&output);
    format!("\n//# sourceMappingURL=data:application/json;base64,{}", encoded)
}
