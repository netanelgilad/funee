use super::{
    declaration::Declaration, get_references_from_declaration::get_references_from_declaration,
    load_module_declaration::load_declaration,
};
use crate::funee_identifier::FuneeIdentifier;
use petgraph::{
    stable_graph::NodeIndex,
    visit::{Dfs, VisitMap},
    Graph,
};
use std::{
    collections::{HashMap, HashSet},
    rc::Rc,
};
use swc_common::{FilePathMapping, Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::Expr;

pub fn load_execution_graph(
    scope: String,
    expression: Expr,
    host_functions: HashSet<FuneeIdentifier>,
    globals: &Globals,
) -> (
    Rc<SourceMap>,
    Graph<(String, Declaration), String>,
    NodeIndex,
    Mark,
) {
    let cm = Rc::new(SourceMap::new(FilePathMapping::empty()));
    let unresolved_mark = GLOBALS.set(globals, || Mark::new());
    let mut definitions_index = HashMap::new();
    let mut execution_graph = Graph::new();
    let root_node = execution_graph.add_node((scope, Declaration::Expr(expression)));
    let mut dfs = Dfs::new(&execution_graph, root_node);
    while let Some(nx) = dfs.next(&execution_graph) {
        let (t, declaration) = &mut execution_graph[nx];
        let references = match declaration {
            Declaration::FuneeIdentifier(identifier) => {
                HashMap::from([(t.clone(), identifier.clone())])
            }
            _ => get_references_from_declaration(declaration, (globals, unresolved_mark))
                .into_iter()
                .map(|x| {
                    (
                        x.clone(),
                        FuneeIdentifier {
                            name: x.clone(),
                            uri: t.clone(),
                        },
                    )
                })
                .collect(),
        };

        for reference in references {
            let declaration = if host_functions.contains(&reference.1) {
                Declaration::HostFn(host_functions.get(&reference.1).unwrap().name.clone())
            } else {
                let mut current_identifier = reference.1.clone();
                loop {
                    let declaration = load_declaration(&cm, &current_identifier)
                        .expect(
                            &("Could not find declaration for ".to_owned()
                                + reference.1.uri.as_str()
                                + ":"
                                + reference.1.name.as_str()),
                        )
                        .declaration;

                    if let Declaration::FuneeIdentifier(i) = declaration {
                        if host_functions.contains(&i) {
                            break Declaration::HostFn(
                                host_functions.get(&i).unwrap().name.clone(),
                            );
                        }
                        current_identifier = i;
                    } else {
                        break declaration;
                    }
                }
            };

            if !definitions_index.contains_key(&reference.1) {
                let node_index = execution_graph.add_node((reference.1.uri.clone(), declaration));
                execution_graph.add_edge(nx, node_index, reference.0);
                definitions_index.insert(reference.1, node_index);

                if !dfs.discovered.is_visited(&node_index) {
                    dfs.discovered.grow(execution_graph.node_count());
                    dfs.stack.push(node_index);
                }
            } else {
                let node_index = definitions_index.get(&reference.1).unwrap();
                execution_graph.add_edge(nx, *node_index, reference.0);
            }
        }
    }
    (cm, execution_graph, root_node, unresolved_mark)
}
