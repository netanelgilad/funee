use swc_common::SyncLrc;
use swc_common::SourceMap;
use swc_ecma_parser::Parser;
use swc_ecma_parser::StringInput;
use swc_ecma_parser::Syntax;
use swc_ecma_parser::TsSyntax;

fn main() {
    let cm = SyncLrc::new(SourceMap::default());
    let code = "default";
    let fm = cm.new_source_file(swc_common::FileName::Custom("test.ts".into()), code.into());
    
    let mut parser = Parser::new(
        Syntax::Typescript(TsSyntax::default()),
        StringInput::from(&*fm),
        None,
    );

    match parser.parse_expr() {
        Ok(expr) => println!("Parsed: {:?}", expr),
        Err(e) => println!("Error: {:?}", e),
    }
}
