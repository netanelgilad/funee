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

/// JavaScript globals provided by the runtime - skip during bundling
fn is_js_global(name: &str) -> bool {
    matches!(
        name,
        // Core globals
        "globalThis" | "undefined" | "NaN" | "Infinity"
        // Constructors / built-in objects
        | "Object" | "Function" | "Boolean" | "Symbol"
        | "Number" | "BigInt" | "Math" | "Date"
        | "String" | "RegExp"
        | "Array" | "Int8Array" | "Uint8Array" | "Uint8ClampedArray"
        | "Int16Array" | "Uint16Array" | "Int32Array" | "Uint32Array"
        | "Float32Array" | "Float64Array" | "BigInt64Array" | "BigUint64Array"
        | "Map" | "Set" | "WeakMap" | "WeakSet" | "WeakRef" | "FinalizationRegistry"
        | "ArrayBuffer" | "SharedArrayBuffer" | "DataView"
        | "Promise" | "Proxy" | "Reflect"
        | "Error" | "AggregateError" | "EvalError" | "RangeError"
        | "ReferenceError" | "SyntaxError" | "TypeError" | "URIError"
        | "JSON" | "Intl" | "Atomics"
        // Functions
        | "eval" | "isFinite" | "isNaN" | "parseFloat" | "parseInt"
        | "decodeURI" | "decodeURIComponent" | "encodeURI" | "encodeURIComponent"
        // Timer functions
        | "setTimeout" | "setInterval" | "clearTimeout" | "clearInterval"
        | "setImmediate" | "clearImmediate"
        | "queueMicrotask"
        // Console
        | "console"
        // Web APIs commonly available
        | "fetch" | "Request" | "Response" | "Headers" | "URL" | "URLSearchParams"
        | "FormData" | "Blob" | "File" | "FileReader"
        | "TextEncoder" | "TextDecoder"
        | "AbortController" | "AbortSignal"
        | "Event" | "EventTarget" | "CustomEvent"
        | "crypto" | "Crypto" | "CryptoKey" | "SubtleCrypto"
        | "atob" | "btoa"
        | "structuredClone"
    )
}

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
                // Skip JavaScript globals - they're provided by the runtime
                if is_js_global(&reference.0) {
                    continue;
                }

                // Resolve the reference to a declaration and track the final URI
                // This is important for import chains: entry.ts -> a.ts -> b.ts
                // When we resolve levelOne from entry.ts, we follow the import to a.ts
                // The node should have a.ts as its URI so references within levelOne resolve correctly
                let (declaration, resolved_uri) = if params.host_functions.contains(&reference.1) {
                    (
                        Declaration::HostFn(
                            params
                                .host_functions
                                .get(&reference.1)
                                .unwrap()
                                .name
                                .clone(),
                        ),
                        reference.1.uri.clone(), // Host functions don't need real URI
                    )
                } else {
                    let mut current_identifier = reference.1.clone();
                    loop {
                        let declaration = load_declaration(&cm, &current_identifier)
                            .expect(
                                &("Could not find declaration for ".to_owned()
                                    + current_identifier.uri.as_str()
                                    + ":"
                                    + current_identifier.name.as_str()),
                            )
                            .declaration;

                        if let Declaration::FuneeIdentifier(i) = declaration {
                            if params.host_functions.contains(&i) {
                                break (
                                    Declaration::HostFn(
                                        params.host_functions.get(&i).unwrap().name.clone(),
                                    ),
                                    current_identifier.uri.clone(),
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
                            break (declaration, current_identifier.uri.clone());
                        }
                    }
                };

                if !definitions_index.contains_key(&reference.1) {
                    let node_index = graph.add_node((resolved_uri, declaration));
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
