use super::{
    get_inline_source_map::get_inline_source_map,
    get_references_from_declaration::rename_references_in_declaration, source_graph::SourceGraph,
};
use crate::emit_module::emit_module;
use petgraph::{
    visit::{DfsPostOrder, EdgeRef},
    Direction::Outgoing,
};
use std::collections::HashMap;
use swc_ecma_ast::{Module, ModuleItem};

impl SourceGraph {
    pub fn into_js_execution_code(self) -> String {
        let mut module_items: Vec<ModuleItem> = vec![];
        let mut dfs = DfsPostOrder::new(&self.graph, self.root);
        while let Some(nx) = dfs.next(&self.graph) {
            let edges = self.graph.edges_directed(nx, Outgoing);
            let to_replace: HashMap<String, String> = edges
                .into_iter()
                .map(|e| {
                    (
                        e.weight().into(),
                        "declaration_".to_string() + &e.target().index().to_string(),
                    )
                })
                .collect();
            let mut declaration = self.graph[nx].1.clone();
            rename_references_in_declaration(
                &mut declaration,
                to_replace,
                (&self.references_mark.globals, self.references_mark.mark),
            );
            module_items.push(
                declaration.into_module_item("declaration_".to_string() + &nx.index().to_string()),
            );
        }
        let module = Module {
            body: module_items,
            shebang: None,
            span: Default::default(),
        };
        let (mut srcmap, buf) = emit_module(self.source_map.clone(), module);
        let execution_code = String::from_utf8(buf).expect("asdasd")
            + &get_inline_source_map(&self.source_map, &mut srcmap);
        execution_code
    }
}
