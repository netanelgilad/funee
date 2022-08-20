mod declaration;
mod get_module_declarations;
mod get_references_from_declaration;
mod load_execution_graph;
mod load_module_declaration;

use crate::{emit_module::emit_module, funee_identifier::FuneeIdentifier, run_js::run_js};
use ast::{Expr, Module, ModuleItem};
use deno_core::{error::AnyError, OpDecl};
use get_references_from_declaration::rename_references_in_declaration;
use load_execution_graph::load_execution_graph;
use petgraph::{
    visit::{DfsPostOrder, EdgeRef},
    Direction::Outgoing,
};
use std::{collections::HashMap, rc::Rc};
use swc_common::{BytePos, Globals, LineCol, SourceMap};
use swc_ecma_ast as ast;

pub fn execute_expression_in_scope(
    expression: Expr,
    scope: String,
    host_functions: HashMap<FuneeIdentifier, OpDecl>,
) -> Result<(), AnyError> {
    let globals = Globals::default();
    let (cm, execution_graph, root_node, unresolved_mark) = load_execution_graph(
        scope,
        expression,
        host_functions.keys().cloned().collect(),
        &globals,
    );

    let mut module_items: Vec<ModuleItem> = vec![];

    let mut dfs = DfsPostOrder::new(&execution_graph, root_node);
    while let Some(nx) = dfs.next(&execution_graph) {
        let edges = execution_graph.edges_directed(nx, Outgoing);
        let to_replace: HashMap<String, String> = edges
            .into_iter()
            .map(|e| {
                (
                    e.weight().into(),
                    "declaration_".to_string() + &e.target().index().to_string(),
                )
            })
            .collect();
        let mut declaration = execution_graph[nx].1.clone();
        rename_references_in_declaration(&mut declaration, to_replace, (&globals, unresolved_mark));
        module_items.push(
            declaration.into_module_item("declaration_".to_string() + &nx.index().to_string()),
        );
    }

    let module = Module {
        body: module_items,
        shebang: None,
        span: Default::default(),
    };

    let (mut srcmap, buf) = emit_module(cm.clone(), module);

    let execution_code =
        String::from_utf8(buf).expect("asdasd") + &get_inline_source_map(&cm, &mut srcmap);

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

fn get_inline_source_map(cm: &Rc<SourceMap>, srcmap: &mut Vec<(BytePos, LineCol)>) -> String {
    let srcmap = cm.build_source_map(srcmap);

    let mut output: Vec<u8> = vec![];
    srcmap.to_writer(&mut output).unwrap();

    let mut result = "\n//# sourceMappingURL=data:application/json;base64,".to_string();
    base64::encode_config_buf(&output, base64::STANDARD, &mut result);
    result
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
