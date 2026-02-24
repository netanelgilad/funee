use super::{
    declaration::Declaration,
    get_inline_source_map::get_inline_source_map,
    get_references_from_declaration::rename_references_in_declaration,
    macro_runtime::{MacroClosure, MacroRuntime},
    source_graph::SourceGraph,
};
use crate::emit_module::emit_module;
use petgraph::{
    stable_graph::NodeIndex,
    visit::{DfsPostOrder, EdgeRef},
    Direction::Outgoing,
};
use std::collections::HashMap;
use swc_ecma_ast::{CallExpr, Callee, Expr, Module, ModuleItem};
use swc_ecma_codegen::{text_writer::JsWriter, Emitter};
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};

impl SourceGraph {
    pub fn into_js_execution_code(mut self) -> String {
        // First, expand all macro calls in the graph
        self.expand_macros();
        
        let mut module_items: Vec<ModuleItem> = vec![];
        let mut dfs = DfsPostOrder::new(&self.graph, self.root);
        while let Some(nx) = dfs.next(&self.graph) {
            let declaration = &self.graph[nx].1;
            
            // Skip macro function definitions - they're not needed at runtime
            if matches!(declaration, Declaration::Macro(_)) {
                continue;
            }
            
            // Skip closure values - they're internal representations
            if matches!(declaration, Declaration::ClosureValue(_)) {
                continue;
            }
            
            let edges = self.graph.edges_directed(nx, Outgoing);
            let to_replace: HashMap<String, String> = edges
                .into_iter()
                .map(|e| {
                    (
                        e.weight().into(),
                        format!("declaration_{}", e.target().index()),
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
                declaration.into_module_item(format!("declaration_{}", nx.index())),
            );
        }
        let module = Module {
            body: module_items,
            shebang: None,
            span: Default::default(),
        };
        let (mut srcmap, buf) = emit_module(self.source_map.clone(), module);
        let code = String::from_utf8(buf).expect("failed to convert to utf8");
        let srcmap_str = get_inline_source_map(&self.source_map, &mut srcmap);
        format!("{}{}", code, srcmap_str)
    }

    /// Expand all macro calls in the graph before emitting
    fn expand_macros(&mut self) {
        // Build a map from edge labels (original identifier names) to their target node indices
        let mut edge_targets: HashMap<(NodeIndex, String), NodeIndex> = HashMap::new();
        
        for edge in self.graph.edge_references() {
            edge_targets.insert((edge.source(), edge.weight().clone()), edge.target());
        }

        // Collect nodes to process
        let nodes: Vec<NodeIndex> = self.graph.node_indices().collect();
        
        let mut runtime = MacroRuntime::new();
        
        for nx in nodes {
            let declaration = self.graph[nx].1.clone();
            
            // Check if this is a VarInit that might be a macro call
            if let Declaration::VarInit(expr) = declaration {
                if let Expr::Call(call_expr) = expr {
                    // Check if the callee is an identifier
                    if let Callee::Expr(callee_expr) = &call_expr.callee {
                        if let Expr::Ident(ident) = callee_expr.as_ref() {
                            let callee_name = ident.sym.to_string();
                            
                            // Look up what this identifier refers to via edges
                            if let Some(target_node) = edge_targets.get(&(nx, callee_name.clone())) {
                                // Check if the target is a macro
                                if matches!(&self.graph[*target_node].1, Declaration::Macro(_)) {
                                    // This is a macro call! Expand it
                                    if let Some(result_expr) = self.execute_macro_call(
                                        nx,
                                        *target_node,
                                        &call_expr,
                                        &edge_targets,
                                        &mut runtime,
                                    ) {
                                        // Replace the VarInit with the result
                                        self.graph[nx].1 = Declaration::VarInit(result_expr);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /// Execute a macro call and return the result expression
    fn execute_macro_call(
        &self,
        source_node: NodeIndex,
        macro_node: NodeIndex,
        call_expr: &CallExpr,
        edge_targets: &HashMap<(NodeIndex, String), NodeIndex>,
        runtime: &mut MacroRuntime,
    ) -> Option<Expr> {
        // Get the macro function
        let macro_fn = match &self.graph[macro_node].1 {
            Declaration::Macro(expr) => expr,
            _ => return None,
        };

        // Convert macro function to code string
        let macro_fn_code = self.expr_to_code(macro_fn);

        // Build arguments as MacroClosures, resolving identifiers to their definitions
        let args: Vec<MacroClosure> = call_expr
            .args
            .iter()
            .map(|arg| {
                // If the argument is an identifier, resolve it to its definition
                let expr_code = if let Expr::Ident(ident) = &*arg.expr {
                    let ident_name = ident.sym.to_string();
                    // Look up what this identifier refers to
                    if let Some(target_node) = edge_targets.get(&(source_node, ident_name)) {
                        // Get the definition's expression
                        match &self.graph[*target_node].1 {
                            Declaration::VarInit(def_expr) => self.expr_to_code(def_expr),
                            Declaration::FnExpr(fn_expr) => self.expr_to_code(&Expr::Fn(fn_expr.clone())),
                            Declaration::Expr(def_expr) => self.expr_to_code(def_expr),
                            _ => self.expr_to_code(&arg.expr),
                        }
                    } else {
                        self.expr_to_code(&arg.expr)
                    }
                } else {
                    self.expr_to_code(&arg.expr)
                };
                MacroClosure {
                    expression: expr_code,
                    references: HashMap::new(), // TODO: track actual references
                }
            })
            .collect();

        // Execute the macro
        match runtime.execute_macro(&macro_fn_code, args) {
            Ok(result) => {
                // Parse the result expression back to AST
                self.parse_expr(&result.expression)
            }
            Err(e) => {
                eprintln!("Macro execution failed: {}", e);
                None
            }
        }
    }

    /// Convert an expression AST to JavaScript code
    fn expr_to_code(&self, expr: &Expr) -> String {
        let mut buf = vec![];
        {
            let wr = JsWriter::new(self.source_map.clone(), "\n", &mut buf, None);
            let mut emitter = Emitter {
                cfg: swc_ecma_codegen::Config::default(),
                cm: self.source_map.clone(),
                comments: None,
                wr: Box::new(wr),
            };
            // Wrap in a module item to emit
            use swc_ecma_ast::{ExprStmt, Stmt};
            let stmt = Stmt::Expr(ExprStmt {
                span: Default::default(),
                expr: Box::new(expr.clone()),
            });
            let module = Module {
                body: vec![ModuleItem::Stmt(stmt)],
                shebang: None,
                span: Default::default(),
            };
            emitter.emit_module(&module).unwrap();
        }
        let code = String::from_utf8(buf).expect("Invalid UTF-8");
        // Remove trailing semicolon and newline
        code.trim().trim_end_matches(';').to_string()
    }

    /// Parse a JavaScript expression string back to AST
    fn parse_expr(&self, code: &str) -> Option<Expr> {
        let cm = self.source_map.clone();
        let fm = cm.new_source_file(
            swc_common::FileName::Anon.into(),
            code.to_string(),
        );
        
        let lexer = Lexer::new(
            Syntax::Typescript(TsSyntax::default()),
            Default::default(),
            StringInput::from(&*fm),
            None,
        );
        
        let mut parser = Parser::new_from(lexer);
        match parser.parse_expr() {
            Ok(expr) => Some(*expr),
            Err(e) => {
                eprintln!("Failed to parse macro result '{}': {:?}", code, e);
                None
            }
        }
    }
}
