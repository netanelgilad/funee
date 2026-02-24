// Conceptual integration showing how MacroRuntime would be used in SourceGraph
// This is NOT complete implementation, but demonstrates the flow described in STEP3_MACRO_EXECUTION.md

use super::macro_runtime::{Closure, MacroResult, MacroRuntime};
use super::source_graph::SourceGraph;
use crate::funee_identifier::FuneeIdentifier;
use deno_core::error::AnyError;
use petgraph::stable_graph::NodeIndex;
use std::collections::{HashMap, HashSet};
use swc_ecma_ast::{CallExpr, Callee, Expr, ExprOrSpread};
use swc_ecma_visit::{VisitMut, VisitMutWith};

impl SourceGraph {
    /// Process all macros in the graph before emitting code
    /// 
    /// This is the entry point for macro expansion. It:
    /// 1. Creates a MacroRuntime (reused across all macro calls)
    /// 2. Iteratively expands macros until none remain
    /// 3. Handles recursive macro calls (macros calling macros)
    pub async fn process_macros(&mut self) -> Result<(), AnyError> {
        let mut macro_runtime = MacroRuntime::new(self.source_map.clone());

        // Iterative expansion: keep processing until no macro calls remain
        // This handles the recursive case where a macro result contains another macro call
        let max_iterations = 100; // Prevent infinite loops
        let mut iteration = 0;

        loop {
            iteration += 1;
            if iteration > max_iterations {
                return Err(anyhow::anyhow!(
                    "Macro expansion exceeded max iterations (possible infinite recursion)"
                ));
            }

            // Find all nodes that contain macro calls
            let nodes_with_macros = self.find_nodes_with_macro_calls();

            if nodes_with_macros.is_empty() {
                break; // Done! No more macros to expand
            }

            // Process each node
            for node_idx in nodes_with_macros {
                self.process_macros_in_node(node_idx, &mut macro_runtime)
                    .await?;
            }
        }

        Ok(())
    }

    /// Find all nodes that contain macro calls
    fn find_nodes_with_macro_calls(&self) -> Vec<NodeIndex> {
        // TODO: Implement by visiting each node's AST and checking for CallExpr
        // where the callee is a reference in self.macro_functions
        vec![]
    }

    /// Process macro calls within a single node
    async fn process_macros_in_node(
        &mut self,
        node_idx: NodeIndex,
        runtime: &mut MacroRuntime,
    ) -> Result<(), AnyError> {
        let (uri, declaration) = &self.graph[node_idx];

        // Get the references for this node (what identifiers it uses)
        let references = self.get_references_for_node(node_idx);

        // Filter to only macro references
        let macro_refs: HashMap<String, FuneeIdentifier> = references
            .iter()
            .filter(|(_, funee_id)| self.macro_functions.contains(funee_id))
            .map(|(local, id)| (local.clone(), id.clone()))
            .collect();

        if macro_refs.is_empty() {
            return Ok(());
        }

        // Create a visitor that will find and replace macro calls
        let mut visitor = MacroCallReplacer {
            source_graph: self,
            macro_refs,
            runtime,
            uri: uri.clone(),
        };

        // Visit the declaration's AST and replace macro calls
        // (In real implementation, would match on declaration type)
        // declaration.visit_mut_with(&mut visitor);

        Ok(())
    }

    /// Execute a single macro call and return the result
    async fn execute_macro_call(
        &self,
        macro_identifier: &FuneeIdentifier,
        call_args: &[ExprOrSpread],
        runtime: &mut MacroRuntime,
    ) -> Result<MacroResult, AnyError> {
        // Step 1: Find the macro function in the graph
        let macro_node_idx = self
            .find_node_by_identifier(macro_identifier)
            .ok_or_else(|| anyhow::anyhow!("Macro not found: {:?}", macro_identifier))?;

        // Step 2: Get the macro function expression
        // (assuming it's stored as Declaration::Macro)
        let (_uri, macro_decl) = &self.graph[macro_node_idx];
        let macro_fn_expr = match macro_decl {
            super::declaration::Declaration::Macro(expr) => expr,
            _ => {
                return Err(anyhow::anyhow!(
                    "Expected macro declaration: {:?}",
                    macro_identifier
                ))
            }
        };

        // Step 3: Convert macro function to JS code
        let macro_fn_code = runtime.expr_to_code(macro_fn_expr);

        // Step 4: Create Closures from call arguments
        let arg_closures = call_args
            .iter()
            .map(|arg| self.create_closure_from_expr(&arg.expr))
            .collect::<Result<Vec<_>, _>>()?;

        // Step 5: Execute the macro!
        // This is where the magic happens - deno_core runs the macro function
        let result = runtime.execute_macro(&macro_fn_code, arg_closures).await?;

        Ok(result)
    }

    /// Create a Closure from an expression
    /// 
    /// A Closure captures:
    /// 1. The expression as JS code (string)
    /// 2. References to out-of-scope identifiers
    fn create_closure_from_expr(&self, expr: &Expr) -> Result<Closure, AnyError> {
        // Convert AST to code string
        let runtime = MacroRuntime::new(self.source_map.clone());
        let expression = runtime.expr_to_code(expr);

        // Get out-of-scope references
        // (This would use get_references_from_declaration logic)
        let references = self.extract_references_from_expr(expr);

        Ok(Closure {
            expression,
            references,
        })
    }

    /// Extract out-of-scope references from an expression
    fn extract_references_from_expr(
        &self,
        _expr: &Expr,
    ) -> HashMap<String, (String, String)> {
        // TODO: Implement by:
        // 1. Using get_references_from_declaration to find all identifiers
        // 2. Filtering to only those that resolve to imports/external definitions
        // 3. Mapping to (uri, name) tuples
        HashMap::new()
    }

    /// Find a node by its FuneeIdentifier
    fn find_node_by_identifier(&self, _identifier: &FuneeIdentifier) -> Option<NodeIndex> {
        // TODO: Implement lookup
        None
    }

    /// Get references for a node
    fn get_references_for_node(&self, _node_idx: NodeIndex) -> HashMap<String, FuneeIdentifier> {
        // TODO: Implement
        HashMap::new()
    }
}

/// Visitor that replaces macro calls with their expanded results
struct MacroCallReplacer<'a> {
    source_graph: &'a SourceGraph,
    macro_refs: HashMap<String, FuneeIdentifier>,
    runtime: &'a mut MacroRuntime,
    uri: String,
}

impl VisitMut for MacroCallReplacer<'_> {
    fn visit_mut_call_expr(&mut self, call: &mut CallExpr) {
        // First, recursively visit children (bottom-up expansion)
        call.visit_mut_children_with(self);

        // Check if this is a macro call
        if let Callee::Expr(callee_expr) = &call.callee {
            if let Expr::Ident(ident) = callee_expr.as_ref() {
                let local_name = ident.sym.to_string();

                // Is this a macro reference?
                if let Some(macro_id) = self.macro_refs.get(&local_name) {
                    // Execute the macro and get the result
                    // Note: We can't do async in VisitMut, so in practice this would
                    // be handled differently (e.g., collect calls first, execute later)
                    
                    // Pseudo-code for what would happen:
                    // let result = self.source_graph
                    //     .execute_macro_call(macro_id, &call.args, self.runtime)
                    //     .await
                    //     .expect("Macro execution failed");
                    
                    // Parse the result expression back to AST
                    // let new_expr = parse_expr(&result.closure.expression)?;
                    
                    // Replace the entire CallExpr with the result
                    // *call = new_expr;
                    
                    // Handle reference conflicts (wrap in IIFE if needed)
                    // self.handle_reference_conflicts(&result);
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_macro_expansion_concept() {
        // This is a conceptual test showing the flow
        // In practice, this would use real SourceGraph with loaded modules

        // 1. Create a graph with a macro and its usage
        // let mut graph = create_test_graph_with_macro();

        // 2. Process macros
        // graph.process_macros().await.unwrap();

        // 3. Verify the macro was expanded
        // assert!(graph contains expanded code, not macro call);
    }

    #[test]
    fn test_closure_creation_concept() {
        // Demonstrate creating a Closure from an expression

        // Input: parse("x + 1")
        // Output: Closure {
        //   expression: "x + 1",
        //   references: { "x": ("./module.ts", "x") }
        // }
    }
}

// Example: How a macro would be detected during graph construction
impl super::declaration::Declaration {
    /// Check if this declaration is a macro (created with createMacro)
    pub fn is_macro_definition(&self, references: &HashMap<String, FuneeIdentifier>) -> bool {
        use super::declaration::Declaration;
        use swc_ecma_ast::{CallExpr, Callee, Expr};

        // Check if this is: const x = createMacro(...)
        match self {
            Declaration::VarInit(init_expr) => {
                if let Expr::Call(CallExpr { callee, .. }) = init_expr {
                    if let Callee::Expr(callee_expr) = callee {
                        if let Expr::Ident(ident) = callee_expr.as_ref() {
                            let local_name = ident.sym.to_string();
                            if let Some(funee_id) = references.get(&local_name) {
                                // Check if it resolves to @opah/core::createMacro
                                return funee_id.uri == "@opah/core"
                                    && funee_id.name == "createMacro";
                            }
                        }
                    }
                }
                false
            }
            _ => false,
        }
    }

    /// Extract the macro function from createMacro(fn)
    pub fn extract_macro_function(&self) -> Option<Expr> {
        use super::declaration::Declaration;
        use swc_ecma_ast::{CallExpr, Expr};

        match self {
            Declaration::Macro(expr) => Some(expr.clone()),
            Declaration::VarInit(Expr::Call(CallExpr { args, .. })) => {
                args.first().map(|arg| (*arg.expr).clone())
            }
            _ => None,
        }
    }
}
