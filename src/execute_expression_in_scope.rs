use ast::{ExportDefaultDecl, Expr, Module, ModuleDecl, ModuleItem};
use std::collections::HashMap;
use swc_ecma_ast as ast;

use deno_core::OpDecl;

use crate::{funee_identifier::FuneeIdentifier, module_loader::emit_module};

mod declaration;
mod get_module_declarations;
mod get_references_from_declaration;
mod load_execution_graph;
mod load_module_declaration;

pub fn execute_expression_in_scope(
    expression: Expr,
    scope: String,
    _: HashMap<FuneeIdentifier, OpDecl>,
) {
    let execution_graph = load_execution_graph::load_execution_graph(scope, expression);

    println!("{:#?}", execution_graph);
}

fn _emit_statements_as_module(
    cm: std::rc::Rc<swc_common::SourceMap>,
    statement: &ExportDefaultDecl,
) {
    let module = Module {
        body: vec![ModuleItem::ModuleDecl(ModuleDecl::ExportDefaultDecl(
            statement.clone(),
        ))],
        shebang: None,
        span: Default::default(),
    };
    let result = emit_module(cm, module);
    let _ = String::from_utf8(result).expect("Found invalid UTF-8");
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::execute_expression_in_scope::execute_expression_in_scope;
    use swc_ecma_ast as ast;

    #[test]
    fn it_works() {
        assert_eq!(
            execute_expression_in_scope(
                ast::Expr::Ident(ast::Ident::new("default".into(), Default::default())),
                "/Users/netanelg/Development/funee/example.ts".to_string(),
                HashMap::new()
            ),
            ()
        );
    }
}
