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
use relative_path::RelativePath;
use std::{
    collections::{HashMap, HashSet},
    path::Path,
    rc::Rc,
};
use swc_common::{FileLoader, FilePathMapping, Globals, Mark, SourceMap, GLOBALS};
use swc_ecma_ast::Expr;

pub struct ReferencesMark {
    pub mark: Mark,
    pub globals: Globals,
}

pub struct SourceGraph {
    pub graph: Graph<(String, Declaration), String>,
    pub root: NodeIndex,
    pub source_map: Rc<SourceMap>,
    pub references_mark: ReferencesMark,
}

pub struct LoadParams {
    pub scope: String,
    pub expression: Expr,
    pub host_functions: HashSet<FuneeIdentifier>,
    pub file_loader: Box<dyn FileLoader + Sync + Send>,
}

impl SourceGraph {
    pub fn load(params: LoadParams) -> Self {
        let globals = Globals::default();
        let cm = Rc::new(SourceMap::with_file_loader(
            params.file_loader,
            FilePathMapping::empty(),
        ));
        let unresolved_mark = GLOBALS.set(&globals, || Mark::new());
        let mut definitions_index = HashMap::new();
        let mut graph = Graph::new();
        let root_node = graph.add_node((params.scope, Declaration::Expr(params.expression)));
        let mut dfs = Dfs::new(&graph, root_node);
        while let Some(nx) = dfs.next(&graph) {
            let (t, declaration) = &mut graph[nx];
            let references = match declaration {
                Declaration::FuneeIdentifier(identifier) => {
                    HashMap::from([(t.clone(), identifier.clone())])
                }
                _ => get_references_from_declaration(declaration, (&globals, unresolved_mark))
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
                let declaration = if params.host_functions.contains(&reference.1) {
                    Declaration::HostFn(
                        params
                            .host_functions
                            .get(&reference.1)
                            .unwrap()
                            .name
                            .clone(),
                    )
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
                            if params.host_functions.contains(&i) {
                                break Declaration::HostFn(
                                    params.host_functions.get(&i).unwrap().name.clone(),
                                );
                            }
                            let relative_path = RelativePath::new(&i.uri);
                            let current_dir = Path::new(&current_identifier.uri)
                                .parent()
                                .unwrap()
                                .to_str()
                                .unwrap();
                            current_identifier = FuneeIdentifier {
                                name: i.name,
                                uri: relative_path
                                    .to_logical_path(&current_dir)
                                    .to_str()
                                    .unwrap()
                                    .to_string(),
                            };
                        } else {
                            break declaration;
                        }
                    }
                };

                if !definitions_index.contains_key(&reference.1) {
                    let node_index = graph.add_node((reference.1.uri.clone(), declaration));
                    graph.add_edge(nx, node_index, reference.0);
                    definitions_index.insert(reference.1, node_index);

                    if !dfs.discovered.is_visited(&node_index) {
                        dfs.discovered.grow(graph.node_count());
                        dfs.stack.push(node_index);
                    }
                } else {
                    let node_index = definitions_index.get(&reference.1).unwrap();
                    graph.add_edge(nx, *node_index, reference.0);
                }
            }
        }

        Self {
            graph,
            source_map: cm,
            references_mark: ReferencesMark {
                mark: unresolved_mark,
                globals,
            },
            root: root_node,
        }
    }
}
