mod declaration;
mod get_inline_source_map;
mod get_module_declarations;
mod get_references_from_declaration;
mod load_module_declaration;
mod program;
mod source_graph;
mod source_graph_to_js_execution_code;

use std::collections::HashSet;

use crate::{funee_identifier::FuneeIdentifier, host::Host, run_js::run_js};
use ast::Expr;
use deno_core::error::AnyError;
use swc_common::FileLoader;
use swc_ecma_ast as ast;

use self::source_graph::{LoadParams, SourceGraph};

pub struct ExecutionRequest {
    pub expression: Expr,
    pub scope: String,
    pub host: &'static mut dyn Host,
    pub file_loader: Box<dyn FileLoader + Sync + Send>,
}

impl ExecutionRequest {
    pub fn execute(self) -> Result<(), AnyError> {
        let source_graph = SourceGraph::load(LoadParams {
            scope: self.scope,
            expression: self.expression,
            host_functions: HashSet::from([FuneeIdentifier {
                uri: "host".to_string(),
                name: "log".to_string(),
            }]),
            file_loader: self.file_loader,
        });

        let execution_code = source_graph.into_js_execution_code();

        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()?;

        if let Err(error) = runtime.block_on(run_js(&execution_code, self.host)) {
            eprintln!("error: {}", error);
        }

        Ok(())
    }
}
