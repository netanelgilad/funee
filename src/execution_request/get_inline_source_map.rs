use std::rc::Rc;
use swc_common::BytePos;
use swc_common::LineCol;
use swc_common::SourceMap;

pub fn get_inline_source_map(cm: &Rc<SourceMap>, srcmap: &mut Vec<(BytePos, LineCol)>) -> String {
    let srcmap = cm.build_source_map(srcmap);

    let mut output: Vec<u8> = vec![];
    srcmap.to_writer(&mut output).unwrap();

    let mut result = "\n//# sourceMappingURL=data:application/json;base64,".to_string();
    base64::encode_config_buf(&output, base64::STANDARD, &mut result);
    result
}
