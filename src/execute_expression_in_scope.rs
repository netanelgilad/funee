mod declaration;
mod get_inline_source_map;
mod get_module_declarations;
mod get_references_from_declaration;
mod load_module_declaration;
mod source_graph;
mod source_graph_to_js_execution_code;

use crate::{funee_identifier::FuneeIdentifier, run_js::run_js};
use ast::Expr;
use deno_core::{error::AnyError, OpDecl};
use std::collections::HashMap;
use swc_ecma_ast as ast;

use self::source_graph::SourceGraph;

pub fn execute_expression_in_scope(
    expression: Expr,
    scope: String,
    host_functions: HashMap<FuneeIdentifier, OpDecl>,
) -> Result<(), AnyError> {
    let source_graph =
        SourceGraph::load(scope, expression, host_functions.keys().cloned().collect());

    let execution_code = source_graph.into_js_execution_code();

    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()?;

    if let Err(error) = runtime.block_on(run_js(
        &execution_code,
        host_functions.into_values().collect(),
    )) {
        eprintln!("error: {}", error);
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::{
        execute_expression_in_scope::execute_expression_in_scope, funee_identifier::FuneeIdentifier,
    };
    use ast::{CallExpr, Callee};
    use deno_core::{error::AnyError, op};
    use std::collections::HashMap;
    use swc_ecma_ast as ast;

    #[op]
    fn op_log(something: String) -> Result<(), AnyError> {
        println!("{:#?}", something);
        Ok(())
    }

    #[test]
    fn it_works() {
        assert_eq!(
            execute_expression_in_scope(
                ast::Expr::Call(CallExpr {
                    span: Default::default(),
                    callee: Callee::Expr(Box::new(ast::Expr::Ident(ast::Ident::new(
                        "default".into(),
                        Default::default()
                    )))),
                    type_args: None,
                    args: vec![],
                }),
                "/Users/netanelg/Development/funee/example.ts".to_string(),
                HashMap::from([(
                    FuneeIdentifier {
                        name: "log".to_string(),
                        uri: "funee".to_string()
                    },
                    op_log::decl()
                )])
            )
            .unwrap(),
            ()
        );
    }
}
